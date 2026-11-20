import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { FadeIn } from '../components/motion';
import { Header, TopBar } from '../components/ui';
import { useLayout } from '../hooks/useLayout';
import { useNotice } from '../hooks/useNotice';
import { usePolling } from '../hooks/usePolling';
import { api, errorMessage } from '../services/api';
import { styles } from '../theme';
import { isClosed, maxPerItem, type Announcement, type Cart, type MenuItem, type Order, type User } from '../types';
import { AnnouncementBanner } from '../components/admin';
import { MenuView } from './MenuView';
import { OrderBuilderView } from './OrderBuilderView';
import { ReviewView } from './ReviewView';
import { TrackingView } from './TrackingView';

type Screen = 'cardapio' | 'revisao' | 'acompanhamento';

/** Fluxo do aluno: cardápio → revisão → acompanhamento. */
export function StudentView({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { wide } = useLayout();
  const [screen, setScreen] = useState<Screen | null>(null);
  const [direction, setDirection] = useState(1);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Cart>({});
  const [order, setOrder] = useState<Order | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, showNotice] = useNotice();

  // Ao entrar, volta para o pedido em andamento, se houver.
  useEffect(() => {
    Promise.all([api.menu(), api.orders()])
      .then(([items, orders]) => {
        const active = orders.find((item) => !isClosed(item.status)) ?? null;
        setMenu(items);
        setOrder(active);
        setScreen(active ? 'acompanhamento' : 'cardapio');
      })
      .catch((error) => {
        showNotice(errorMessage(error));
        setScreen('cardapio');
      });
  }, [showNotice]);

  // Se a atendente esgotar um item que está no pedido, ele sai do pedido com um aviso.
  const applyMenu = (items: MenuItem[]) => {
    setMenu(items);
    const gone = items.filter((item) => !item.available && cart[item.id]);
    if (!gone.length) return;
    setCart((current) => {
      const next = { ...current };
      gone.forEach((item) => delete next[item.id]);
      return next;
    });
    const names = gone.map((item) => item.name).join(' e ');
    showNotice(gone.length === 1 ? `${names} esgotou e foi removido do pedido.` : `${names} esgotaram e foram removidos do pedido.`);
  };
  const refreshMenu = () => api.menu().then(applyMenu);

  usePolling(refreshMenu, 5000, screen === 'cardapio' || screen === 'revisao');

  // Aviso da cantina: busca ao entrar e a cada 15 segundos.
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  useEffect(() => {
    api.announcement().then(setAnnouncement, () => {});
  }, []);
  usePolling(() => api.announcement().then(setAnnouncement), 15000);
  usePolling(() => order && api.order(order.number).then(setOrder), 4000, screen === 'acompanhamento' && order !== null);

  const goTo = (next: Screen, nextDirection = 1) => {
    showNotice('');
    setDirection(nextDirection);
    setScreen(next);
  };

  const changeQuantity = (id: string, delta: number) => {
    const { [id]: quantity = 0, ...others } = cart;
    const next = quantity + delta;
    if (next > maxPerItem) return showNotice(`Limite de ${maxPerItem} unidades por item.`);
    showNotice('');
    setCart(next > 0 ? { ...others, [id]: next } : others);
  };

  const confirmOrder = async () => {
    const items = Object.entries(cart).map(([id, quantity]) => ({ id, quantity }));
    if (!items.length) return showNotice('Adicione pelo menos um item antes de confirmar.');
    setSending(true);
    try {
      const created = await api.createOrder(items);
      setOrder(created);
      setCart({});
      goTo('acompanhamento');
    } catch (error) {
      showNotice(errorMessage(error));
      refreshMenu().catch(() => {});
    } finally {
      setSending(false);
    }
  };

  const startNewOrder = () => {
    setOrder(null);
    goTo('cardapio');
    refreshMenu().catch(() => {});
  };

  const header = wide ? <TopBar user={user} onLogout={onLogout} /> : <Header user={user} onLogout={onLogout} />;
  if (screen === null) {
    return (
      <>
        {header}
        <Text style={styles.caption}>Carregando…</Text>
      </>
    );
  }

  const tracking = screen === 'acompanhamento' && order;
  let body;
  if (tracking) body = <TrackingView order={tracking} onNewOrder={startNewOrder} />;
  else if (wide) {
    // No computador, cardápio e revisão ficam na mesma tela.
    body = (
      <OrderBuilderView
        menu={menu}
        cart={cart}
        notice={notice}
        sending={sending}
        onChange={changeQuantity}
        onConfirm={confirmOrder}
      />
    );
  } else if (screen === 'revisao') {
    body = (
      <ReviewView
        menu={menu}
        cart={cart}
        notice={notice}
        sending={sending}
        onChange={changeQuantity}
        onConfirm={confirmOrder}
        onBack={() => goTo('cardapio', -1)}
      />
    );
  } else {
    body = <MenuView menu={menu} cart={cart} notice={notice} onChange={changeQuantity} onNext={() => goTo('revisao')} />;
  }

  return (
    <>
      {header}
      <AnnouncementBanner announcement={announcement} />
      <FadeIn
        key={wide && !tracking ? 'pedido' : screen}
        x={wide ? 0 : 24 * direction}
        y={wide ? 10 : 0}
        style={styles.screen}
      >
        {body}
      </FadeIn>
    </>
  );
}

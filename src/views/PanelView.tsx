import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { AnnouncementEditor, DailyReport, MenuEditor } from '../components/admin';
import { OrderCard } from '../components/orders';
import { Header, NoticeBox, Panel, Switcher, TopBar } from '../components/ui';
import { useLayout } from '../hooks/useLayout';
import { useNotice } from '../hooks/useNotice';
import { usePolling } from '../hooks/usePolling';
import { api, errorMessage } from '../services/api';
import { styles } from '../theme';
import { isClosed, type Announcement, type MenuItem, type Order, type Report, type Status, type User } from '../types';

type Tab = 'pedidos' | 'cardapio' | 'avisos' | 'resumo';
const tabs: { value: Tab; label: string }[] = [
  { value: 'pedidos', label: 'Pedidos' },
  { value: 'cardapio', label: 'Cardápio' },
  { value: 'avisos', label: 'Avisos' },
  { value: 'resumo', label: 'Resumo' },
];
const allShifts = 'Todos';
// Encerrados ficam visíveis só os mais recentes, para a coluna não crescer sem fim.
const closedShown = 8;

/** Área da atendente: pedidos chegando, cardápio e resumo do dia. */
export function PanelView({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { wide } = useLayout();
  const [tab, setTab] = useState<Tab>('pedidos');
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [shifts, setShifts] = useState<string[]>([]);
  const [shift, setShift] = useState(allShifts);
  // undefined: ainda carregando; null: nenhum aviso publicado.
  const [announcement, setAnnouncement] = useState<Announcement | null>();
  const [notice, showNotice] = useNotice();

  useEffect(() => {
    api.orders().then(setOrders, (error) => showNotice(errorMessage(error)));
    api.menu().then(setMenu, () => {});
    api.school().then((school) => setShifts(school.shifts), () => {});
    api.announcement().then(setAnnouncement, () => setAnnouncement(null));
  }, [showNotice]);

  const refresh = useCallback(() => {
    if (tab === 'pedidos') return api.orders().then(setOrders);
    if (tab === 'cardapio') return api.menu().then(setMenu);
    if (tab === 'resumo') return api.report().then(setReport);
  }, [tab]);
  usePolling(refresh, 4000);

  // Erros viram aviso na tela; o retorno diz se deu certo (o formulário só limpa quando salva).
  const attempt = async (work: () => Promise<void>) => {
    try {
      await work();
      showNotice('');
      return true;
    } catch (error) {
      showNotice(errorMessage(error));
      return false;
    }
  };

  const setStatus = (number: number, status: Status) =>
    attempt(async () => {
      const updated = await api.setStatus(number, status);
      setOrders((current) => current?.map((order) => (order.number === number ? updated : order)) ?? current);
    });

  const createItem = (name: string, priceCents: number) =>
    attempt(async () => {
      const item = await api.createItem(name, priceCents);
      setMenu((current) => [...current, item]);
    });

  const updateItem = (item: MenuItem, changes: Partial<MenuItem>) =>
    attempt(async () => {
      const updated = await api.updateItem(item.id, changes);
      setMenu((current) => current.map((entry) => (entry.id === item.id ? updated : entry)));
    });

  const saveAnnouncement = (text: string) =>
    attempt(async () => {
      setAnnouncement(await api.setAnnouncement(text));
    });

  const changeTab = (next: Tab) => {
    setTab(next);
    showNotice('');
    if (next === 'resumo') api.report().then(setReport, (error) => showNotice(errorMessage(error)));
  };

  const visible = (orders ?? []).filter((order) => shift === allShifts || order.shift === shift);
  const shiftFilter = shifts.length > 0 && (
    <Switcher
      kind="radio"
      options={[allShifts, ...shifts].map((value) => ({ value, label: value }))}
      value={shift}
      onChange={setShift}
    />
  );
  const noticeBox = notice.message ? (
    <View style={{ marginBottom: 16 }}>
      <NoticeBox notice={notice} />
    </View>
  ) : null;

  const menuEditor = <MenuEditor menu={menu} onCreate={createItem} onUpdate={updateItem} onError={showNotice} />;
  const announcementEditor =
    announcement === undefined ? (
      <Text style={styles.caption}>Carregando…</Text>
    ) : (
      <AnnouncementEditor announcement={announcement} onSave={saveAnnouncement} />
    );

  if (wide) {
    // Entregues e cancelados dividem a última coluna.
    const columns = [
      { name: 'Em preparo', match: (status: Status) => status === 'Em preparo' },
      { name: 'Pronto', match: (status: Status) => status === 'Pronto' },
      { name: 'Encerrados', match: isClosed },
    ].map(({ name, match }) => {
      const all = visible.filter((order) => match(order.status));
      return { name, all, shown: name === 'Encerrados' ? all.slice(0, closedShown) : all };
    });

    return (
      <>
        <TopBar user={user} subtitle="Área da atendente" onLogout={onLogout}>
          <Switcher options={tabs} value={tab} onChange={changeTab} />
        </TopBar>
        {noticeBox}
        {tab === 'cardapio' && (
          <Panel>
            <Text style={styles.title}>Cardápio</Text>
            {menuEditor}
          </Panel>
        )}
        {tab === 'avisos' && (
          <Panel>
            <Text style={styles.title}>Aviso para os alunos</Text>
            {announcementEditor}
          </Panel>
        )}
        {tab === 'resumo' && (
          <Panel>
            <Text style={styles.title}>Resumo de hoje</Text>
            <DailyReport report={report} />
          </Panel>
        )}
        {tab === 'pedidos' && (
          <>
            <View style={[styles.row, { marginBottom: 16 }]}>
              <Text style={styles.caption}>Filtrar por turno</Text>
              {shiftFilter}
            </View>
            <View style={styles.board}>
              {columns.map(({ name, all, shown }) => (
                <Panel key={name} style={styles.column}>
                  <View style={styles.columnHeader}>
                    <Text style={styles.columnName}>{name}</Text>
                    <Text style={styles.count}>{all.length}</Text>
                  </View>
                  {orders === null && <Text style={styles.caption}>Carregando…</Text>}
                  {orders !== null && shown.length === 0 && <Text style={styles.empty}>Nenhum pedido.</Text>}
                  {shown.map((order) => (
                    <OrderCard key={order.number} order={order} onStatus={setStatus} />
                  ))}
                  {all.length > shown.length && <Text style={styles.caption}>Mostrando os {closedShown} mais recentes.</Text>}
                </Panel>
              ))}
            </View>
          </>
        )}
      </>
    );
  }

  return (
    <>
      <Header user={user} onLogout={onLogout} />
      <View style={{ marginBottom: 16 }}>
        <Switcher options={tabs} value={tab} onChange={changeTab} />
      </View>
      {noticeBox}
      {tab === 'cardapio' && menuEditor}
      {tab === 'avisos' && announcementEditor}
      {tab === 'resumo' && <DailyReport report={report} />}
      {tab === 'pedidos' && (
        <View style={styles.list}>
          {shiftFilter}
          {orders === null ? (
            <Text style={styles.caption}>Carregando…</Text>
          ) : visible.length === 0 ? (
            <Text style={styles.empty}>Nenhum pedido por enquanto.</Text>
          ) : (
            visible.map((order) => <OrderCard key={order.number} order={order} onStatus={setStatus} />)
          )}
        </View>
      )}
    </>
  );
}

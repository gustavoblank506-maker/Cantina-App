import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Fraunces_900Black } from '@expo-google-fonts/fraunces';
import { DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';

const colors = {
  page: '#EADCC3',
  surface: '#FAF5EC',
  ink: '#1E1A16',
  muted: '#6F675C',
  line: '#BDB2A0',
  orange: '#C8743C',
  note: '#EFE7D8',
  error: '#A5301F',
  errorSurface: '#F8E1D9',
  success: '#2F6B46',
};

const fonts = { title: 'Fraunces_900Black', body: 'DMSans_400Regular', medium: 'DMSans_600SemiBold', bold: 'DMSans_700Bold' };

type Status = 'Em preparo' | 'Pronto' | 'Entregue';
type Screen = 'cardapio' | 'revisao' | 'acompanhamento';
type Order = { number: number; name: string; summary: string; status: Status };

const statuses: Status[] = ['Em preparo', 'Pronto', 'Entregue'];

const menu = [
  { id: 'sanduiche', name: 'Sanduíche natural', price: 7 },
  { id: 'misto', name: 'Misto quente', price: 6 },
  { id: 'coxinha', name: 'Coxinha', price: 5 },
  { id: 'suco', name: 'Suco de laranja', price: 4 },
  { id: 'agua', name: 'Água', price: 2.5 },
];

const initialOrders: Order[] = [
  { number: 46, name: 'Pedro Lima', summary: '2 misto quente', status: 'Em preparo' },
  { number: 44, name: 'João Melo', summary: '1 bolo, 1 água', status: 'Pronto' },
];

const money = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;
const orderNumber = (value: number) => String(value).padStart(3, '0');

export default function App() {
  const [fontsLoaded] = useFonts({ Fraunces_900Black, DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold });
  const { width } = useWindowDimensions();
  const [view, setView] = useState<'aluno' | 'atendente'>('aluno');
  const [screen, setScreen] = useState<Screen>('cardapio');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [soldOut, setSoldOut] = useState<string[]>(['coxinha']);
  const [orders, setOrders] = useState(initialOrders);
  const [nextNumber, setNextNumber] = useState(47);
  const [activeNumber, setActiveNumber] = useState<number | null>(null);

  if (!fontsLoaded) return <View style={styles.page} />;

  const changeQuantity = (id: string, delta: number) =>
    setCart((current) => {
      const { [id]: quantity = 0, ...others } = current;
      return quantity + delta > 0 ? { ...others, [id]: quantity + delta } : others;
    });

  const confirmOrder = () => {
    const summary = menu
      .filter((item) => cart[item.id])
      .map((item) => `${cart[item.id]} ${item.name.toLowerCase()}`)
      .join(', ');
    setOrders((current) => [{ number: nextNumber, name: 'Ana Souza', summary, status: 'Em preparo' }, ...current]);
    setActiveNumber(nextNumber);
    setNextNumber((value) => value + 1);
    setCart({});
    setScreen('acompanhamento');
  };

  const startNewOrder = () => {
    setActiveNumber(null);
    setScreen('cardapio');
  };

  const setOrderStatus = (number: number, status: Status) =>
    setOrders((current) => current.map((order) => (order.number === number ? { ...order, status } : order)));

  const toggleSoldOut = (id: string) =>
    setSoldOut((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const activeOrder = orders.find((order) => order.number === activeNumber);
  const student = (
    <Phone>
      {screen === 'cardapio' && (
        <MenuScreen cart={cart} soldOut={soldOut} onAdd={(id) => changeQuantity(id, 1)} onNext={() => setScreen('revisao')} />
      )}
      {screen === 'revisao' && (
        <ReviewScreen
          cart={cart}
          soldOut={soldOut}
          onChange={changeQuantity}
          onConfirm={confirmOrder}
          onBack={() => setScreen('cardapio')}
        />
      )}
      {screen === 'acompanhamento' && activeOrder && <TrackingScreen order={activeOrder} onNewOrder={startNewOrder} />}
    </Phone>
  );
  const attendant = (
    <Phone>
      <PanelScreen orders={orders} soldOut={soldOut} onStatus={setOrderStatus} onToggleSoldOut={toggleSoldOut} />
    </Phone>
  );
  const sideBySide = width >= 760;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <StatusBar style="dark" />
      {!sideBySide && (
        <View style={styles.switcher}>
          {(['aluno', 'atendente'] as const).map((option) => (
            <Pressable
              key={option}
              accessibilityRole="tab"
              accessibilityState={{ selected: view === option }}
              onPress={() => setView(option)}
              style={[styles.switchOption, view === option && styles.switchSelected]}
            >
              <Text style={[styles.switchText, view === option && styles.switchTextSelected]}>
                {option === 'aluno' ? 'Aluno' : 'Atendente'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.phones}>
        {sideBySide ? (
          <>
            <View>
              <Text style={styles.phoneLabel}>Aluno</Text>
              {student}
            </View>
            <View>
              <Text style={styles.phoneLabel}>Atendente</Text>
              {attendant}
            </View>
          </>
        ) : view === 'aluno' ? (
          student
        ) : (
          attendant
        )}
      </View>
    </ScrollView>
  );
}

function Phone({ children }: { children: ReactNode }) {
  return <View style={styles.phone}>{children}</View>;
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.primaryButton}>
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.secondaryButton}>
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

function RoundButton({ label, name, onPress }: { label: string; name: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={name} onPress={onPress} style={styles.roundButton}>
      <Text style={styles.roundText}>{label}</Text>
    </Pressable>
  );
}

function MenuScreen({
  cart,
  soldOut,
  onAdd,
  onNext,
}: {
  cart: Record<string, number>;
  soldOut: string[];
  onAdd: (id: string) => void;
  onNext: () => void;
}) {
  const count = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  return (
    <>
      <Text style={styles.title}>Cardápio</Text>
      <View style={styles.list}>
        {menu.map((item) => {
          const unavailable = soldOut.includes(item.id);
          return (
            <View key={item.id} style={styles.card}>
              <View>
                <Text style={[styles.itemName, unavailable && styles.mutedText]}>{item.name}</Text>
                <Text style={[styles.itemPrice, unavailable && styles.mutedText]}>{money(item.price)}</Text>
              </View>
              {unavailable ? (
                <Text style={styles.soldOut}>Esgotado</Text>
              ) : (
                <RoundButton label="+" name={`Adicionar ${item.name}`} onPress={() => onAdd(item.id)} />
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.footer}>
        <PrimaryButton label={count ? `Ver pedido (${count})` : 'Ver pedido'} onPress={onNext} />
      </View>
    </>
  );
}

function ReviewScreen({
  cart,
  soldOut,
  onChange,
  onConfirm,
  onBack,
}: {
  cart: Record<string, number>;
  soldOut: string[];
  onChange: (id: string, delta: number) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const [error, setError] = useState('');
  const items = menu.filter((item) => cart[item.id]);
  const total = items.reduce((sum, item) => sum + item.price * cart[item.id], 0);

  const confirm = () => {
    if (!items.length) setError('Adicione pelo menos um item antes de confirmar.');
    else if (items.some((item) => soldOut.includes(item.id))) setError('Remova o item esgotado para confirmar.');
    else onConfirm();
  };

  return (
    <>
      <Text style={styles.title}>Meu pedido</Text>
      <View style={styles.list}>
        {!items.length && <Text style={styles.empty}>Seu pedido está vazio.</Text>}
        {items.map((item) => (
          <View key={item.id} style={styles.reviewCard}>
            <View style={styles.row}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemName}>{money(item.price * cart[item.id])}</Text>
            </View>
            <View style={styles.row}>
              <View style={styles.quantity}>
                <RoundButton label="−" name={`Diminuir ${item.name}`} onPress={() => onChange(item.id, -1)} />
                <Text style={styles.quantityText}>{cart[item.id]}</Text>
                <RoundButton label="+" name={`Aumentar ${item.name}`} onPress={() => onChange(item.id, 1)} />
              </View>
              <Pressable accessibilityRole="button" onPress={() => onChange(item.id, -cart[item.id])}>
                <Text style={styles.remove}>Remover</Text>
              </Pressable>
            </View>
            {soldOut.includes(item.id) && <Text style={styles.inlineError}>Este item acabou de esgotar.</Text>}
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalText}>Total</Text>
          <Text style={styles.totalText}>{money(total)}</Text>
        </View>
        <Text style={styles.caption}>Pagamento na retirada.</Text>
      </View>
      <View style={styles.footer}>
        {!!error && (
          <Text accessibilityRole="alert" style={styles.errorBox}>
            {error}
          </Text>
        )}
        <PrimaryButton label="Confirmar pedido" onPress={confirm} />
        <SecondaryButton label="Voltar ao cardápio" onPress={onBack} />
      </View>
    </>
  );
}

function TrackingScreen({ order, onNewOrder }: { order: Order; onNewOrder: () => void }) {
  const notes: Record<Status, string> = {
    'Em preparo': 'Quando estiver Pronto, vá ao balcão, mostre o número e pague.',
    Pronto: 'Seu pedido está pronto! Vá ao balcão, mostre o número e pague.',
    Entregue: 'Pedido entregue. Bom lanche!',
  };
  return (
    <>
      <Text style={styles.title}>Meu pedido</Text>
      <View style={styles.list}>
        <View style={styles.ticket}>
          <Text style={styles.success}>✓ Pedido confirmado</Text>
          <Text style={styles.caption}>Número do pedido</Text>
          <Text style={styles.ticketNumber}>{orderNumber(order.number)}</Text>
          <Text style={styles.caption}>{order.name}</Text>
        </View>
        <Text style={styles.sectionLabel}>Situação</Text>
        {statuses.map((status) => {
          const current = status === order.status;
          return (
            <View key={status} style={[styles.statusRow, current && styles.selected]}>
              <Text style={[styles.statusText, current && styles.selectedText]}>
                {current ? '●' : '○'}  {status}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.footer}>
        <Text style={styles.note}>{notes[order.status]}</Text>
        {order.status === 'Entregue' && <PrimaryButton label="Fazer novo pedido" onPress={onNewOrder} />}
      </View>
    </>
  );
}

function PanelScreen({
  orders,
  soldOut,
  onStatus,
  onToggleSoldOut,
}: {
  orders: Order[];
  soldOut: string[];
  onStatus: (number: number, status: Status) => void;
  onToggleSoldOut: (id: string) => void;
}) {
  const [managing, setManaging] = useState(false);
  return (
    <>
      <Text style={styles.title}>{managing ? 'Itens' : 'Pedidos'}</Text>
      <View style={styles.list}>
        {managing
          ? menu.map((item) => {
              const unavailable = soldOut.includes(item.id);
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: unavailable }}
                  onPress={() => onToggleSoldOut(item.id)}
                  style={styles.card}
                >
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={unavailable ? styles.soldOut : styles.caption}>{unavailable ? 'Esgotado' : 'Disponível'}</Text>
                </Pressable>
              );
            })
          : orders.map((order) => (
              <View key={order.number} style={styles.reviewCard}>
                <Text style={styles.orderTitle}>
                  {orderNumber(order.number)} · {order.name}
                </Text>
                <Text style={styles.itemPrice}>{order.summary}</Text>
                <View style={styles.pills}>
                  {statuses.map((status) => {
                    const current = status === order.status;
                    return (
                      <Pressable
                        key={status}
                        accessibilityRole="button"
                        accessibilityLabel={`Pedido ${orderNumber(order.number)}: ${status}`}
                        accessibilityState={{ selected: current }}
                        onPress={() => onStatus(order.number, status)}
                        style={[styles.pill, current && styles.selected]}
                      >
                        <Text style={[styles.pillText, current && styles.selectedText]}>{status}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
      </View>
      <View style={styles.footer}>
        <SecondaryButton label={managing ? 'Voltar aos pedidos' : 'Marcar item esgotado'} onPress={() => setManaging(!managing)} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  pageContent: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 16, paddingVertical: 24 },
  switcher: { flexDirection: 'row', gap: 4, padding: 4, marginBottom: 16, borderRadius: 999, borderWidth: 1, borderColor: colors.ink },
  switchOption: { paddingHorizontal: 24, paddingVertical: 8, borderRadius: 999 },
  switchSelected: { backgroundColor: colors.ink },
  switchText: { fontFamily: fonts.medium, color: colors.ink, fontSize: 14 },
  switchTextSelected: { color: colors.surface },
  phones: { flexDirection: 'row', gap: 40, justifyContent: 'center', maxWidth: '100%' },
  phoneLabel: { fontFamily: fonts.bold, color: colors.ink, fontSize: 14, marginBottom: 8 },
  phone: {
    width: 340,
    maxWidth: '100%',
    minHeight: 640,
    backgroundColor: colors.surface,
    borderColor: colors.ink,
    borderWidth: 2,
    borderRadius: 28,
    padding: 20,
  },
  title: { fontFamily: fonts.title, color: colors.ink, fontSize: 24, marginBottom: 16 },
  list: { flex: 1, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 12,
  },
  reviewCard: { gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemName: { fontFamily: fonts.medium, color: colors.ink, fontSize: 14 },
  itemPrice: { fontFamily: fonts.body, color: colors.muted, fontSize: 13, marginTop: 2 },
  mutedText: { color: colors.muted },
  soldOut: { fontFamily: fonts.bold, color: colors.ink, fontSize: 13 },
  roundButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundText: { fontFamily: fonts.medium, color: colors.ink, fontSize: 18, lineHeight: 20 },
  footer: { gap: 10, marginTop: 16 },
  primaryButton: { backgroundColor: colors.orange, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  primaryText: { fontFamily: fonts.bold, color: colors.ink, fontSize: 15 },
  secondaryButton: { borderWidth: 1, borderColor: colors.ink, borderRadius: 999, paddingVertical: 13, alignItems: 'center' },
  secondaryText: { fontFamily: fonts.bold, color: colors.ink, fontSize: 15 },
  empty: { fontFamily: fonts.body, color: colors.muted, fontSize: 14, paddingVertical: 12 },
  quantity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quantityText: { fontFamily: fonts.bold, color: colors.ink, fontSize: 14 },
  remove: { fontFamily: fonts.medium, color: colors.ink, fontSize: 13, textDecorationLine: 'underline', padding: 6 },
  inlineError: { fontFamily: fonts.medium, color: colors.error, fontSize: 13 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  totalText: { fontFamily: fonts.bold, color: colors.ink, fontSize: 16 },
  caption: { fontFamily: fonts.body, color: colors.muted, fontSize: 13 },
  errorBox: {
    fontFamily: fonts.medium,
    color: colors.error,
    backgroundColor: colors.errorSurface,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
  },
  ticket: { alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 16 },
  success: { fontFamily: fonts.bold, color: colors.success, fontSize: 13, marginBottom: 6 },
  ticketNumber: { fontFamily: fonts.title, color: colors.ink, fontSize: 48 },
  sectionLabel: { fontFamily: fonts.bold, color: colors.ink, fontSize: 14, marginTop: 6 },
  statusRow: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  statusText: { fontFamily: fonts.medium, color: colors.muted, fontSize: 14 },
  selected: { backgroundColor: colors.ink, borderColor: colors.ink },
  selectedText: { color: colors.surface },
  note: { fontFamily: fonts.body, color: colors.ink, backgroundColor: colors.note, borderRadius: 12, padding: 12, fontSize: 13 },
  orderTitle: { fontFamily: fonts.bold, color: colors.ink, fontSize: 14 },
  pills: { flexDirection: 'row', gap: 6 },
  pill: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: colors.ink, borderRadius: 999, paddingVertical: 6 },
  pillText: { fontFamily: fonts.medium, color: colors.ink, fontSize: 12 },
});

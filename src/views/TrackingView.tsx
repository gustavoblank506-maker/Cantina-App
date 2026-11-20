import { Text, View } from 'react-native';
import { FadeIn, Pop } from '../components/motion';
import { Panel, PrimaryButton } from '../components/ui';
import { money, orderNumber, orderSummary } from '../format';
import { useLayout } from '../hooks/useLayout';
import { styles } from '../theme';
import { isClosed, statuses, type Order, type Status } from '../types';

const notes: Record<Status, string> = {
  'Em preparo': 'Quando estiver Pronto, vá ao balcão, mostre o número e pague.',
  Pronto: 'Seu pedido está pronto! Vá ao balcão, mostre o número e pague.',
  Entregue: 'Pedido entregue. Bom lanche!',
  Cancelado: 'A cantina cancelou este pedido. Se quiser, faça um novo ou fale com a atendente no balcão.',
};

export function TrackingView({ order, onNewOrder }: { order: Order; onNewOrder: () => void }) {
  const { wide } = useLayout();
  const closed = isClosed(order.status);
  const cancelled = order.status === 'Cancelado';
  const flow = cancelled ? [...statuses, order.status] : statuses;

  const ticket = (
    <Pop>
      <View style={[styles.ticket, wide && { paddingVertical: 32 }]}>
        {cancelled ? (
          <Text style={styles.cancelledText}>Pedido cancelado</Text>
        ) : (
          <Text style={styles.success}>✓ Pedido confirmado</Text>
        )}
        <Text style={styles.caption}>Número do pedido</Text>
        <Text style={[styles.ticketNumber, wide && { fontSize: 72 }]}>{orderNumber(order.number)}</Text>
        <Text style={styles.caption}>{order.customer}</Text>
        <Text style={styles.caption}>
          {orderSummary(order)} · {money(order.totalCents)}
        </Text>
      </View>
    </Pop>
  );

  const steps = (
    <>
      <Text style={styles.sectionLabel}>Situação</Text>
      {flow.map((status) => {
        const current = status === order.status;
        return (
          <Pop key={`${status}-${current}`}>
            <View style={[styles.statusRow, current && styles.selected]}>
              <Text style={[styles.statusText, current && styles.selectedText]}>
                {current ? '●' : '○'}  {status}
              </Text>
            </View>
          </Pop>
        );
      })}
    </>
  );

  const next = (
    <View style={styles.footer}>
      <FadeIn key={order.status}>
        <Text accessibilityLiveRegion="polite" style={styles.note}>
          {notes[order.status]}
        </Text>
      </FadeIn>
      {closed && <PrimaryButton label="Fazer novo pedido" onPress={onNewOrder} />}
    </View>
  );

  if (wide) {
    return (
      <Panel style={styles.trackingPanel}>
        <Text style={styles.title}>Meu pedido</Text>
        <View style={styles.split}>
          <View style={{ flex: 1 }}>{ticket}</View>
          <View style={{ flex: 1, gap: 10 }}>
            {steps}
            {next}
          </View>
        </View>
      </Panel>
    );
  }

  return (
    <>
      <Text style={styles.title}>Meu pedido</Text>
      <View style={styles.list}>
        {ticket}
        {steps}
      </View>
      {next}
    </>
  );
}

import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { money, orderNumber, orderSummary } from '../format';
import { styles } from '../theme';
import { statuses, type Cart, type MenuItem, type Order, type Status } from '../types';
import { FadeIn, Tap } from './motion';
import { QuantityControl } from './ui';

/** Itens do pedido em montagem, com total. O valor oficial é calculado pelo servidor. */
export function CartItems({
  menu,
  cart,
  onChange,
}: {
  menu: MenuItem[];
  cart: Cart;
  onChange: (id: string, delta: number) => void;
}) {
  const items = menu.filter((item) => cart[item.id]);
  const total = items.reduce((sum, item) => sum + item.priceCents * cart[item.id], 0);

  return (
    <>
      {!items.length && <Text style={styles.empty}>Seu pedido está vazio.</Text>}
      {items.map((item, index) => (
        <FadeIn key={item.id} delay={index * 45} style={styles.reviewCard}>
          <View style={styles.row}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemName}>{money(item.priceCents * cart[item.id])}</Text>
          </View>
          <View style={styles.row}>
            <QuantityControl item={item.name} quantity={cart[item.id]} onChange={(delta) => onChange(item.id, delta)} />
            <Tap accessibilityRole="button" onPress={() => onChange(item.id, -cart[item.id])}>
              <Text style={styles.remove}>Remover</Text>
            </Tap>
          </View>
        </FadeIn>
      ))}
      <View style={styles.totalRow}>
        <Text style={styles.totalText}>Total</Text>
        <Text style={styles.totalText}>{money(total)}</Text>
      </View>
      <Text style={styles.caption}>Pagamento na retirada.</Text>
    </>
  );
}

/** Pedido no painel da atendente, com os botões de situação. */
export function OrderCard({ order, onStatus }: { order: Order; onStatus: (number: number, status: Status) => void }) {
  // Cancelar pede um segundo toque, para não cancelar sem querer. O pedido de confirmação some em 4 segundos.
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  const cancelled = order.status === 'Cancelado';
  const student = [order.course, order.shift].filter(Boolean).join(' · ');

  return (
    <FadeIn style={[styles.reviewCard, cancelled && styles.cancelledCard]}>
      <Text style={styles.orderTitle}>
        {orderNumber(order.number)} · {order.customer}
      </Text>
      {student ? <Text style={styles.itemPrice}>{student}</Text> : null}
      <Text style={styles.itemPrice}>
        {orderSummary(order)} · {money(order.totalCents)}
      </Text>
      {cancelled ? (
        <Text style={styles.cancelledText}>Cancelado</Text>
      ) : (
        <>
          <OrderStatusPills order={order} onStatus={onStatus} />
          {order.status !== 'Entregue' && (
            <Tap
              accessibilityRole="button"
              accessibilityLabel={confirming ? `Confirmar cancelamento do pedido ${orderNumber(order.number)}` : undefined}
              onPress={() => (confirming ? onStatus(order.number, 'Cancelado') : setConfirming(true))}
              style={{ alignSelf: 'flex-start' }}
            >
              <Text style={[styles.remove, { paddingHorizontal: 0, paddingVertical: 4 }, confirming && styles.cancelledText]}>
                {confirming ? 'Toque de novo para cancelar' : 'Cancelar pedido'}
              </Text>
            </Tap>
          )}
        </>
      )}
    </FadeIn>
  );
}

function OrderStatusPills({ order, onStatus }: { order: Order; onStatus: (number: number, status: Status) => void }) {
  return (
    <View style={styles.pills}>
      {statuses.map((status) => {
        const current = status === order.status;
        return (
          <Tap
            key={status}
            accessibilityRole="button"
            accessibilityLabel={`Pedido ${orderNumber(order.number)}: ${status}`}
            accessibilityState={{ selected: current }}
            onPress={() => onStatus(order.number, status)}
            style={[styles.pill, current && styles.selected]}
          >
            <Text style={[styles.pillText, current && styles.selectedText]}>{status}</Text>
          </Tap>
        );
      })}
    </View>
  );
}

import { Text, View } from 'react-native';
import { Grid } from '../components/Grid';
import { MenuItemCard } from '../components/menu';
import { FadeIn } from '../components/motion';
import { CartItems } from '../components/orders';
import { NoticeBox, Panel, PrimaryButton } from '../components/ui';
import { styles } from '../theme';
import { maxPerItem, type Cart, type MenuItem, type Notice } from '../types';

/** Computador: cardápio em grade com o pedido sempre visível ao lado (substitui a etapa de revisão). */
export function OrderBuilderView({
  menu,
  cart,
  notice,
  sending,
  onChange,
  onConfirm,
}: {
  menu: MenuItem[];
  cart: Cart;
  notice: Notice;
  sending: boolean;
  onChange: (id: string, delta: number) => void;
  onConfirm: () => void;
}) {
  return (
    <View style={styles.split}>
      <Panel style={{ flex: 1 }}>
        <Text style={styles.title}>Cardápio</Text>
        <Text style={[styles.caption, { marginTop: -8, marginBottom: 16 }]}>Limite de {maxPerItem} unidades por item.</Text>
        <Grid minItemWidth={190}>
          {menu.map((item, index) => (
            <FadeIn key={item.id} delay={index * 45}>
              <MenuItemCard tile item={item} quantity={cart[item.id] ?? 0} onChange={(delta) => onChange(item.id, delta)} />
            </FadeIn>
          ))}
        </Grid>
      </Panel>
      <Panel style={styles.sidebar}>
        <Text style={styles.title}>Meu pedido</Text>
        <View style={{ gap: 10 }}>
          <CartItems menu={menu} cart={cart} onChange={onChange} />
        </View>
        <View style={styles.footer}>
          <NoticeBox notice={notice} />
          <PrimaryButton label={sending ? 'Enviando…' : 'Confirmar pedido'} onPress={onConfirm} disabled={sending} />
        </View>
      </Panel>
    </View>
  );
}

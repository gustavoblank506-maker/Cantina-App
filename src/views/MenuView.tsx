import { Text, View } from 'react-native';
import { MenuItemCard } from '../components/menu';
import { FadeIn, Pop } from '../components/motion';
import { NoticeBox, PrimaryButton } from '../components/ui';
import { styles } from '../theme';
import { maxPerItem, type Cart, type MenuItem, type Notice } from '../types';

/** Celular: cardápio. */
export function MenuView({
  menu,
  cart,
  notice,
  onChange,
  onNext,
}: {
  menu: MenuItem[];
  cart: Cart;
  notice: Notice;
  onChange: (id: string, delta: number) => void;
  onNext: () => void;
}) {
  const count = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  return (
    <>
      <Text style={styles.title}>Cardápio</Text>
      <View style={styles.list}>
        <Text style={styles.caption}>Limite de {maxPerItem} unidades por item.</Text>
        {menu.map((item, index) => (
          <FadeIn key={item.id} delay={index * 45}>
            <MenuItemCard item={item} quantity={cart[item.id] ?? 0} onChange={(delta) => onChange(item.id, delta)} />
          </FadeIn>
        ))}
      </View>
      <View style={styles.footer}>
        <NoticeBox notice={notice} />
        <Pop key={count}>
          <PrimaryButton label={count ? `Ver pedido (${count})` : 'Ver pedido'} onPress={onNext} />
        </Pop>
      </View>
    </>
  );
}

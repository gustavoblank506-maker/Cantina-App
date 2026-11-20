import { Text, View } from 'react-native';
import { CartItems } from '../components/orders';
import { NoticeBox, PrimaryButton, SecondaryButton } from '../components/ui';
import { styles } from '../theme';
import type { Cart, MenuItem, Notice } from '../types';

/** Celular: revisão do pedido. */
export function ReviewView({
  menu,
  cart,
  notice,
  sending,
  onChange,
  onConfirm,
  onBack,
}: {
  menu: MenuItem[];
  cart: Cart;
  notice: Notice;
  sending: boolean;
  onChange: (id: string, delta: number) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <Text style={styles.title}>Meu pedido</Text>
      <View style={styles.list}>
        <CartItems menu={menu} cart={cart} onChange={onChange} />
      </View>
      <View style={styles.footer}>
        <NoticeBox notice={notice} />
        <PrimaryButton label={sending ? 'Enviando…' : 'Confirmar pedido'} onPress={onConfirm} disabled={sending} />
        <SecondaryButton label="Voltar ao cardápio" onPress={onBack} disabled={sending} />
      </View>
    </>
  );
}

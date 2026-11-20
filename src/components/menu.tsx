import { Text, View } from 'react-native';
import { money } from '../format';
import { styles } from '../theme';
import type { MenuItem } from '../types';
import { QuantityControl, RoundButton } from './ui';

/** Item do cardápio do aluno. tile: formato de cartão para a grade do computador. */
export function MenuItemCard({
  item,
  quantity,
  onChange,
  tile = false,
}: {
  item: MenuItem;
  quantity: number;
  onChange: (delta: number) => void;
  tile?: boolean;
}) {
  const control = !item.available ? (
    <Text style={styles.soldOut}>Esgotado</Text>
  ) : quantity ? (
    <QuantityControl item={item.name} quantity={quantity} onChange={onChange} />
  ) : (
    <RoundButton label="+" name={`Adicionar ${item.name}`} onPress={() => onChange(1)} />
  );

  return (
    <View style={tile ? styles.tile : styles.card}>
      <View>
        <Text style={[styles.itemName, !item.available && styles.mutedText]}>{item.name}</Text>
        <Text style={[styles.itemPrice, !item.available && styles.mutedText]}>{money(item.priceCents)}</Text>
      </View>
      {tile ? <View style={styles.tileFooter}>{control}</View> : control}
    </View>
  );
}

/** Interruptor da atendente: disponível ou esgotado. */

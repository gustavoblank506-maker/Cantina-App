import { Children, useState, type ReactNode } from 'react';
import { View } from 'react-native';

/** Grade que cabe quantas colunas couberem, todas da mesma largura. */
export function Grid({ minItemWidth, gap = 14, children }: { minItemWidth: number; gap?: number; children: ReactNode }) {
  const [width, setWidth] = useState(0);
  const columns = Math.max(1, Math.floor((width + gap) / (minItemWidth + gap)));
  const itemWidth = Math.floor((width - gap * (columns - 1)) / columns);

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {width > 0 && Children.map(children, (child) => <View style={{ width: itemWidth }}>{child}</View>)}
    </View>
  );
}

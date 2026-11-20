import { useWindowDimensions } from 'react-native';

/** wide: computador (layout em colunas). fullBleed: celular (ocupa a tela toda). Entre os dois: moldura de celular. */
export function useLayout() {
  const { width } = useWindowDimensions();
  return { wide: width >= 900, fullBleed: width < 480 };
}

import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

const useNativeDriver = Platform.OS !== 'web';
let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
  reduceMotion = enabled;
});

export function FadeIn({
  children,
  delay = 0,
  x = 0,
  y = 10,
  style,
}: {
  children: ReactNode;
  delay?: number;
  x?: number;
  y?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver,
    }).start();
  }, [progress, delay]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [x, 0] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [y, 0] });
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateX }, { translateY }] }]}>{children}</Animated.View>;
}

/**
 * Texto que sobe letra a letra, saindo de uma máscara.
 * Adaptação do slide-up-text do Spell UI (que é para React + Tailwind) feita com Animated.
 */
export function SlideUpText({ text, style, delay = 0 }: { text: string; style: StyleProp<TextStyle>; delay?: number }) {
  const letters = Array.from(text);
  const values = useRef(letters.map(() => new Animated.Value(reduceMotion ? 1 : 0))).current;
  const distance = (StyleSheet.flatten(style)?.fontSize ?? 40) * 0.8;

  useEffect(() => {
    Animated.stagger(
      45,
      values.map((value) =>
        Animated.timing(value, { toValue: 1, duration: 640, delay, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver }),
      ),
    ).start();
  }, [values, delay]);

  return (
    <View role="heading" aria-label={text} style={{ flexDirection: 'row', overflow: 'hidden' }}>
      {letters.map((letter, index) => (
        <Animated.Text
          key={index}
          aria-hidden
          style={[
            style,
            {
              opacity: values[index],
              transform: [{ translateY: values[index].interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
            },
          ]}
        >
          {letter}
        </Animated.Text>
      ))}
    </View>
  );
}

export function Pop({ children }: { children: ReactNode }) {
  const scale = useRef(new Animated.Value(reduceMotion ? 1 : 0.92)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 120, useNativeDriver }).start();
  }, [scale]);

  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

export function Shake({ children }: { children: ReactNode }) {
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 320, easing: Easing.linear, useNativeDriver }).start();
  }, [progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: [0, -6, 6, -4, 4, 0],
  });
  return <Animated.View style={{ transform: [{ translateX }] }}>{children}</Animated.View>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Tap({ style, ...props }: Omit<ComponentProps<typeof Pressable>, 'style'> & { style?: StyleProp<ViewStyle> }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressTo = (toValue: number) => {
    if (!reduceMotion) Animated.spring(scale, { toValue, speed: 40, bounciness: 8, useNativeDriver }).start();
  };

  return (
    <AnimatedPressable
      {...props}
      onPressIn={() => pressTo(0.95)}
      onPressOut={() => pressTo(1)}
      style={[style, { transform: [{ scale }] }]}
    />
  );
}

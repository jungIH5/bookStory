import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder, Dimensions, Image } from 'react-native';
import { BookOpen, Pause, Play, Square, X } from 'lucide-react-native';
import { Colors, BorderRadius, Shadow } from '@/constants/theme';
import { useTimerStore } from '@/store/useTimerStore';

const formatTimer = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const WIDGET_W = 220;

export default function FloatingTimerWidget() {
  const { timerBook, timerSeconds, timerRunning, timerWidgetHidden, pauseTimer, resumeTimer, stopTimer, setWidgetHidden } = useTimerStore();
  const pan = useRef(new Animated.ValueXY({ x: (SCREEN_W - WIDGET_W) / 2, y: SCREEN_H - 220 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => pan.flattenOffset(),
    })
  ).current;

  if (!timerBook || timerWidgetHidden) return null;

  return (
    <Animated.View
      style={[styles.wrap, { transform: pan.getTranslateTransform() }]}
      {...panResponder.panHandlers}
    >
      <View style={styles.cover}>
        {timerBook.image
          ? <Image source={{ uri: timerBook.image }} style={styles.coverImg} />
          : <BookOpen size={12} color={timerRunning ? Colors.secondary : Colors.textMuted} />}
      </View>
      <Text style={styles.title} numberOfLines={1}>{timerBook.title}</Text>
      <Text style={[styles.time, { color: timerRunning ? Colors.secondary : Colors.textMuted }]}>
        {formatTimer(timerSeconds)}
      </Text>
      <TouchableOpacity style={styles.iconBtn} onPress={timerRunning ? pauseTimer : resumeTimer}>
        {timerRunning ? <Pause size={13} color={Colors.secondary} /> : <Play size={13} color={Colors.secondary} />}
      </TouchableOpacity>
      <TouchableOpacity style={[styles.iconBtn, styles.stopBtn]} onPress={stopTimer}>
        <Square size={11} color={Colors.error} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconBtn} onPress={() => setWidgetHidden(true)}>
        <X size={13} color={Colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute', width: WIDGET_W, top: 0, left: 0, zIndex: 9000,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(28,20,14,0.96)', borderRadius: BorderRadius.full,
    paddingVertical: 8, paddingHorizontal: 10,
    borderWidth: 1, borderColor: 'rgba(139,107,66,0.35)',
    ...Shadow.lg,
  },
  cover: {
    width: 18, height: 25, borderRadius: 3, overflow: 'hidden',
    backgroundColor: 'rgba(140,107,66,0.15)', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  coverImg: { width: '100%', height: '100%' },
  title: { flex: 1, fontSize: 11, fontWeight: '700', color: '#9E8D7A' },
  time: { fontSize: 13, fontWeight: '900', fontVariant: ['tabular-nums'], minWidth: 44, textAlign: 'center' },
  iconBtn: {
    width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(139,107,66,0.15)',
  },
  stopBtn: { backgroundColor: 'rgba(239,68,68,0.12)' },
});

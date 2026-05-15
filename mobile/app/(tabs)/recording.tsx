import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Pressable, Platform,
} from 'react-native';
import { Mic, Square, Upload, FileAudio, X, Sparkles, WifiOff } from 'lucide-react-native';
import { MotiView } from 'moti';
import NetInfo from '@react-native-community/netinfo';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { recordingsApi, RecordingResult } from '@/services/api';
import { useUserStore } from '@/store/useUserStore';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function RecordingScreen() {
  const { user } = useUserStore();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [pickedFile, setPickedFile] = useState<{ name: string; uri: string; size?: number } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<RecordingResult | null>(null);

  const [isOffline, setIsOffline] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Audio.requestPermissionsAsync();
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!(state.isConnected && state.isInternetReachable !== false));
    });
    return () => { if (timerRef.current) clearInterval(timerRef.current); unsubscribe(); };
  }, []);

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
      setRecordingUri(null);
      setPickedFile(null);
      setResult(null);
      timerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch (e) {
      Alert.alert('오류', '마이크 접근 권한이 필요합니다.');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    await recordingRef.current.stopAndUnloadAsync();
    const uri = recordingRef.current.getURI();
    setRecordingUri(uri ?? null);
    setIsRecording(false);
    recordingRef.current = null;
  };

  const handlePickFile = async () => {
    if (isRecording) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/*'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const file = result.assets[0];
      setPickedFile({ name: file.name, uri: file.uri, size: file.size });
      setRecordingUri(null);
      setRecordingDuration(0);
      setResult(null);
    }
  };

  const handleAnalyze = async () => {
    const uri = recordingUri ?? pickedFile?.uri;
    if (!uri) return;
    setIsAnalyzing(true);
    setResult(null);
    try {
      const data = await recordingsApi.upload(uri, user?.id);
      setResult(data);
    } catch {
      Alert.alert('오류', '분석 중 오류가 발생했습니다. 파일 형식을 확인해주세요.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setRecordingUri(null);
    setPickedFile(null);
    setRecordingDuration(0);
    setResult(null);
  };

  const hasSource = !!(recordingUri || pickedFile?.uri);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {isOffline && (
        <MotiView
          from={{ opacity: 0, translateY: -8 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.offlineBanner}
        >
          <WifiOff size={14} color="white" />
          <Text style={styles.offlineText}>인터넷 연결이 없습니다. 분석 기능이 제한됩니다.</Text>
        </MotiView>
      )}
      <Text style={styles.subtitle}>독서모임 대화를 녹음하거나 파일을 업로드해 AI가 분석합니다.</Text>

      {/* 녹음 버튼 */}
      <View style={[styles.recordCard, isRecording && styles.recordCardActive]}>
        <View style={styles.micWrap}>
          {isRecording && (
            <>
              <MotiView
                from={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ type: 'timing', duration: 1200, loop: true }}
                style={[styles.pulse, { backgroundColor: 'rgba(220,74,60,0.3)' }]}
              />
              <MotiView
                from={{ scale: 1, opacity: 0.3 }}
                animate={{ scale: 1.7, opacity: 0 }}
                transition={{ type: 'timing', duration: 1200, loop: true, delay: 300 }}
                style={[styles.pulse, { backgroundColor: 'rgba(220,74,60,0.2)' }]}
              />
            </>
          )}
          <TouchableOpacity
            onPress={isRecording ? stopRecording : startRecording}
            style={[styles.micBtn, isRecording && styles.micBtnActive]}
            activeOpacity={0.8}
          >
            {isRecording
              ? <Square size={26} color="white" fill="white" />
              : <Mic size={28} color="white" />}
          </TouchableOpacity>
        </View>

        {(isRecording || recordingDuration > 0) ? (
          <View style={styles.durationWrap}>
            <Text style={[styles.durationText, isRecording && styles.durationTextActive]}>
              {formatDuration(recordingDuration)}
            </Text>
            <Text style={[styles.durationLabel, isRecording && styles.durationLabelActive]}>
              {isRecording ? '녹음 중 — 버튼을 눌러 정지' : '녹음 완료'}
            </Text>
            {!isRecording && (
              <Pressable onPress={handleReset}>
                <Text style={styles.resetLink}>다시 녹음</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <Text style={styles.recordHint}>버튼을 눌러 녹음을 시작하세요</Text>
        )}
      </View>

      {/* 파일 업로드 */}
      <TouchableOpacity
        style={[styles.uploadArea, pickedFile && styles.uploadAreaFilled, isRecording && styles.uploadAreaDisabled]}
        onPress={handlePickFile}
        disabled={isRecording}
        activeOpacity={0.7}
      >
        {pickedFile ? (
          <View style={styles.fileInfo}>
            <FileAudio size={15} color={Colors.primary} />
            <Text style={styles.fileName} numberOfLines={1}>{pickedFile.name}</Text>
            {pickedFile.size && (
              <Text style={styles.fileSize}>({(pickedFile.size / 1024 / 1024).toFixed(1)} MB)</Text>
            )}
            <Pressable onPress={(e) => { e.stopPropagation?.(); handleReset(); }}>
              <X size={14} color={Colors.textMuted} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.uploadPlaceholder}>
            <Upload size={14} color={Colors.textMuted} />
            <Text style={styles.uploadText}>파일 업로드 (MP3, WAV, M4A)</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* 분석 버튼 */}
      <TouchableOpacity
        style={[styles.analyzeBtn, (!hasSource || isAnalyzing || isRecording) && styles.analyzeBtnDisabled]}
        onPress={handleAnalyze}
        disabled={!hasSource || isAnalyzing || isRecording}
      >
        {isAnalyzing ? (
          <>
            <ActivityIndicator size="small" color="white" />
            <Text style={styles.analyzeBtnText}>내용 정리 중...</Text>
          </>
        ) : (
          <>
            <Sparkles size={18} color="white" />
            <Text style={styles.analyzeBtnText}>AI 분석 시작</Text>
          </>
        )}
      </TouchableOpacity>

      {/* 분석 결과 */}
      {result && <AnalysisResult result={result} />}
    </ScrollView>
  );
}

function AnalysisResult({ result }: { result: RecordingResult }) {
  return (
    <View style={styles.resultWrap}>
      <Text style={styles.resultHeading}>분석 결과</Text>

      {result.summary && (
        <ResultSection title="모임 요약">
          <Text style={styles.resultText}>{result.summary}</Text>
        </ResultSection>
      )}

      {result.key_topics && result.key_topics.length > 0 && (
        <ResultSection title="주요 주제">
          <View style={styles.topicList}>
            {result.key_topics.map((topic, i) => (
              <View key={i} style={styles.topicChip}>
                <Text style={styles.topicText}>{topic}</Text>
              </View>
            ))}
          </View>
        </ResultSection>
      )}

      {result.followup_questions && result.followup_questions.length > 0 && (
        <ResultSection title="후속 토론 질문">
          {result.followup_questions.map((q, i) => (
            <View key={i} style={styles.questionItem}>
              <Text style={styles.questionNum}>{i + 1}</Text>
              <Text style={styles.questionText}>{q}</Text>
            </View>
          ))}
        </ResultSection>
      )}

      {result.user_contributions && Object.keys(result.user_contributions).length > 0 && (
        <ResultSection title="발화자별 기여">
          {Object.entries(result.user_contributions).map(([speaker, summary]) => (
            <View key={speaker} style={styles.speakerItem}>
              <View style={styles.speakerAvatar}>
                <Text style={styles.speakerInitial}>{speaker[0]}</Text>
              </View>
              <View style={styles.speakerInfo}>
                <Text style={styles.speakerName}>{speaker}</Text>
                <Text style={styles.speakerSummary}>{summary}</Text>
              </View>
            </View>
          ))}
        </ResultSection>
      )}

      {result.transcript && (
        <ResultSection title="전체 전사 내용">
          <Text style={styles.transcriptText}>{result.labeled_transcript || result.transcript}</Text>
        </ResultSection>
      )}
    </View>
  );
}

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#374151', borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  offlineText: { flex: 1, fontSize: FontSize.xs, color: 'white', fontWeight: '600' },

  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600', lineHeight: 20 },

  recordCard: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, alignItems: 'center', gap: Spacing.md,
    backgroundColor: 'rgba(139,107,66,0.03)',
  },
  recordCardActive: { backgroundColor: 'rgba(220,74,60,0.03)', borderColor: 'rgba(220,74,60,0.3)' },

  micWrap: {
    width: 72, height: 72, alignItems: 'center', justifyContent: 'center',
  },
  pulse: {
    position: 'absolute', width: 72, height: 72, borderRadius: 36,
  },
  micBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.md,
  },
  micBtnActive: { backgroundColor: '#dc4a3c' },

  durationWrap: { alignItems: 'center', gap: 4 },
  durationText: { fontSize: 32, fontWeight: '900', color: Colors.primary, letterSpacing: 2 },
  durationTextActive: { color: '#dc4a3c' },
  durationLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textMuted },
  durationLabelActive: { color: '#dc4a3c' },
  resetLink: { fontSize: 11, color: Colors.textMuted, textDecorationLine: 'underline', marginTop: 4 },
  recordHint: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '600' },

  uploadArea: {
    borderWidth: 1.5, borderColor: 'rgba(139,107,66,0.18)', borderStyle: 'dashed',
    borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center',
  },
  uploadAreaFilled: { borderColor: 'rgba(140,107,66,0.4)', backgroundColor: 'rgba(140,107,66,0.05)' },
  uploadAreaDisabled: { opacity: 0.4 },
  uploadPlaceholder: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  uploadText: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '600' },
  fileInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  fileName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary, flex: 1 },
  fileSize: { fontSize: FontSize.xs, color: Colors.textMuted },

  analyzeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    padding: Spacing.md, ...Shadow.md,
  },
  analyzeBtnDisabled: { opacity: 0.4 },
  analyzeBtnText: { color: 'white', fontWeight: '800', fontSize: FontSize.md },

  resultWrap: { gap: Spacing.sm },
  resultHeading: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.text, letterSpacing: -0.5 },

  section: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
  },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '900', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
  resultText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22 },

  topicList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topicChip: {
    backgroundColor: 'rgba(140,107,66,0.1)', borderWidth: 1, borderColor: 'rgba(140,107,66,0.2)',
    borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 4,
  },
  topicText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },

  questionItem: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  questionNum: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, color: 'white',
    textAlign: 'center', lineHeight: 22, fontSize: 11, fontWeight: '900',
  },
  questionText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },

  speakerItem: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  speakerAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  speakerInitial: { fontSize: FontSize.sm, fontWeight: '900', color: 'white' },
  speakerInfo: { flex: 1, gap: 2 },
  speakerName: { fontSize: FontSize.sm, fontWeight: '900', color: Colors.text },
  speakerSummary: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },

  transcriptText: {
    fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

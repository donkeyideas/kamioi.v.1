import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import {
  Shield,
  TrendingUp,
  Plane,
  Target,
  Plus,
  X,
} from 'lucide-react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/hooks/useAuth'
import { useGoals, useCreateGoal } from '@/hooks/useGoals'
import { GlassCard, Badge, Button, Input, LoadingSpinner } from '@/components/ui'
import { formatCurrency } from '@/utils/format'

const GOAL_ICONS: Record<string, typeof Shield> = {
  savings: Shield,
  investment: TrendingUp,
  emergency: Shield,
  vacation: Plane,
  custom: Target,
}

const GOAL_TYPE_OPTIONS = [
  { key: 'savings', label: 'Savings' },
  { key: 'investment', label: 'Investment' },
  { key: 'emergency', label: 'Emergency' },
  { key: 'vacation', label: 'Vacation' },
  { key: 'custom', label: 'Custom' },
]

function getGoalBadge(progress: number, createdAt: string): { label: string; variant: 'success' | 'warning' | 'info' } {
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysSinceCreated <= 7) return { label: 'New', variant: 'info' }
  if (progress >= 50) return { label: 'On Track', variant: 'success' }
  return { label: 'Behind', variant: 'warning' }
}

function getFooterText(progress: number, currentAmount: number, targetAmount: number): string {
  if (progress >= 100) return 'Goal reached!'
  const remaining = targetAmount - currentAmount
  return `${formatCurrency(remaining)} remaining`
}

export default function GoalsScreen() {
  const { colors, brand, gradientColors, status } = useTheme()
  const insets = useSafeAreaInsets()
  const { profile } = useAuth()
  const { data: goals = [], isLoading } = useGoals(profile?.id)
  const createGoal = useCreateGoal()
  const [showModal, setShowModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newType, setNewType] = useState('savings')

  const activeGoals = useMemo(() => goals.filter(g => g.progress < 100), [goals])

  const handleCreate = async () => {
    if (!profile?.id || !newTitle.trim() || !newAmount.trim()) return
    const amount = parseFloat(newAmount)
    if (isNaN(amount) || amount <= 0) return

    await createGoal.mutateAsync({
      user_id: profile.id,
      title: newTitle.trim(),
      target_amount: amount,
      goal_type: newType,
    })
    setNewTitle('')
    setNewAmount('')
    setNewType('savings')
    setShowModal(false)
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.base, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Goals</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {activeGoals.length} active goal{activeGoals.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <LoadingSpinner />
        </View>
      ) : goals.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No goals yet. Create your first one!
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {goals.map(goal => {
            const Icon = GOAL_ICONS[goal.goal_type] || Target
            const badge = getGoalBadge(goal.progress, goal.created_at)
            const progressPct = Math.min(goal.progress, 100)
            const footer = getFooterText(goal.progress, goal.current_amount, goal.target_amount)

            return (
              <GlassCard key={goal.id} borderRadius={16} padding={20} style={styles.goalCard}>
                {/* Header row */}
                <View style={styles.goalHeader}>
                  <View style={styles.goalHeaderLeft}>
                    <View style={[styles.iconCircle, { backgroundColor: `${brand.purple}1A` }]}>
                      <Icon size={18} color={brand.purple} />
                    </View>
                    <Text style={[styles.goalTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {goal.title}
                    </Text>
                  </View>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </View>

                {/* Amounts row */}
                <View style={styles.amountsRow}>
                  <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
                    <Text style={[styles.amountValue, { color: colors.textPrimary }]}>
                      {formatCurrency(goal.current_amount)}
                    </Text>
                    {' saved'}
                  </Text>
                  <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
                    <Text style={[styles.amountValue, { color: colors.textPrimary }]}>
                      {formatCurrency(goal.target_amount)}
                    </Text>
                    {' goal'}
                  </Text>
                </View>

                {/* Progress bar */}
                <View style={[styles.progressTrack, { backgroundColor: colors.surfaceInput }]}>
                  {progressPct > 0 && (
                    <LinearGradient
                      colors={[gradientColors[0], gradientColors[1], gradientColors[2]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: `${progressPct}%` }]}
                    />
                  )}
                </View>

                {/* Footer */}
                <Text style={[styles.footerText, { color: colors.textMuted }]}>
                  {footer}
                </Text>
              </GlassCard>
            )
          })}
        </ScrollView>
      )}

      {/* Create Button */}
      <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 80 }]}>
        <Button
          variant="secondary"
          icon={<Plus size={18} color={colors.textPrimary} />}
          onPress={() => setShowModal(true)}
        >
          Create New Goal
        </Button>
      </View>

      {/* Create Goal Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.base, borderColor: colors.borderSubtle }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>New Goal</Text>
              <Pressable onPress={() => setShowModal(false)}>
                <X size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Input
              label="Goal Name"
              placeholder="e.g., Emergency Fund"
              value={newTitle}
              onChangeText={setNewTitle}
              containerStyle={{ marginBottom: 16 }}
            />

            <Input
              label="Target Amount"
              placeholder="5000"
              value={newAmount}
              onChangeText={setNewAmount}
              keyboardType="numeric"
              containerStyle={{ marginBottom: 16 }}
            />

            {/* Goal Type Selector */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Goal Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
              <View style={styles.typeRow}>
                {GOAL_TYPE_OPTIONS.map(opt => {
                  const isSelected = newType === opt.key
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => setNewType(opt.key)}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: isSelected ? `${brand.purple}26` : colors.surfaceInput,
                          borderColor: isSelected ? `${brand.purple}4D` : colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          { color: isSelected ? brand.purple : colors.textSecondary },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </ScrollView>

            <View style={{ marginTop: 24 }}>
              <Button
                onPress={handleCreate}
                loading={createGoal.isPending}
                disabled={!newTitle.trim() || !newAmount.trim()}
              >
                Create Goal
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 180,
    gap: 16,
  },
  goalCard: {
    marginBottom: 0,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  goalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  amountValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  amountLabel: {
    fontSize: 13,
  },
  progressTrack: {
    height: 8,
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  footerText: {
    fontSize: 12,
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  typeScroll: {
    flexGrow: 0,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
})

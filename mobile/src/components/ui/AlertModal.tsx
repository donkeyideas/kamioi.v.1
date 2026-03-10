import React from 'react'
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { X } from 'lucide-react-native'

export interface AlertButton {
  text: string
  style?: 'default' | 'cancel' | 'destructive'
  onPress?: () => void
}

interface AlertModalProps {
  visible: boolean
  title: string
  message?: string
  buttons?: AlertButton[]
  onClose: () => void
  children?: React.ReactNode
}

export function AlertModal({ visible, title, message, buttons, onClose, children }: AlertModalProps) {
  const { colors, brand } = useTheme()

  const effectiveButtons = buttons && buttons.length > 0
    ? buttons
    : [{ text: 'OK', onPress: onClose }]

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.popup, { backgroundColor: colors.base, borderColor: colors.borderSubtle }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.content}>
            {/* Message */}
            {message ? (
              <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
            ) : null}

            {/* Custom content */}
            {children}

            {/* Buttons */}
            <View style={styles.buttons}>
              {effectiveButtons.map((btn, idx) => {
                const isDestructive = btn.style === 'destructive'
                const isCancel = btn.style === 'cancel'
                return (
                  <Pressable
                    key={idx}
                    onPress={() => {
                      btn.onPress?.()
                      onClose()
                    }}
                    style={[
                      styles.button,
                      {
                        backgroundColor: isDestructive
                          ? 'rgba(239,68,68,0.1)'
                          : isCancel
                            ? colors.surfaceInput
                            : `${brand.purple}1A`,
                        borderColor: isDestructive
                          ? 'rgba(239,68,68,0.2)'
                          : isCancel
                            ? colors.borderSubtle
                            : `${brand.purple}33`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        {
                          color: isDestructive
                            ? '#EF4444'
                            : isCancel
                              ? colors.textSecondary
                              : brand.purple,
                        },
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  popup: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  content: {
    padding: 20,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
})

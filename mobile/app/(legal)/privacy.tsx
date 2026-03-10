import React from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { useTheme } from '@/theme/ThemeProvider'

export default function PrivacyPolicyScreen() {
  const { colors, brand } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textSecondary} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Back</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>Privacy Policy</Text>
        <Text style={[styles.updated, { color: colors.textMuted }]}>
          Last updated: March 1, 2026
        </Text>

        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Welcome to Kamioi. Your privacy is critically important to us. This Privacy Policy explains how Kamioi ("we," "us," or "our") collects, uses, shares, and protects your personal information when you use our mobile application and related services (collectively, the "Service").
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>1. Information We Collect</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          We collect information you provide directly to us, including:{'\n\n'}
          - Account information such as your name, email address, and password when you create an account.{'\n'}
          - Financial information including linked bank account details, transaction history, and investment preferences. This data is used to facilitate round-up calculations and stock allocation.{'\n'}
          - Receipt data including uploaded images and AI-extracted content such as store names, item descriptions, and amounts.{'\n'}
          - Device information including your device model, operating system version, unique device identifiers, and push notification tokens.{'\n'}
          - Usage data including how you interact with the Service, pages visited, features used, and timestamps.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>2. How We Use Your Information</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          We use the information we collect to:{'\n\n'}
          - Provide, operate, and maintain the Service.{'\n'}
          - Process transactions, calculate round-ups, and allocate investments to stocks on your behalf.{'\n'}
          - Process receipt images using AI vision providers (such as DeepSeek, Anthropic Claude, or OpenAI) to extract purchase data and map items to relevant stock tickers.{'\n'}
          - Send you notifications about your portfolio, transactions, and account activity.{'\n'}
          - Improve and personalize your experience with the Service.{'\n'}
          - Comply with legal obligations and enforce our terms.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>3. AI Processing</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          When you upload a receipt, the image may be sent to third-party AI providers for processing. We support multiple providers, and you may select your preferred provider in Settings. Receipt images are sent securely and are not retained by AI providers beyond the processing session. If you provide your own API key ("Bring Your Own Key"), requests are made directly with your credentials.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>4. Data Sharing</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          We do not sell your personal information. We may share your information with:{'\n\n'}
          - Service providers who assist us in operating the Service (e.g., Supabase for data storage, banking API providers for account linking).{'\n'}
          - AI vision providers solely for the purpose of processing receipt images you upload.{'\n'}
          - Legal authorities when required by law, regulation, or legal process.{'\n'}
          - Business partners in the event of a merger, acquisition, or sale of assets, with prior notice to you.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>5. Data Security</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          We implement industry-standard security measures including encryption in transit (TLS) and at rest, secure authentication via Supabase Auth, and row-level security policies on all database tables. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>6. Data Retention</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          We retain your personal information for as long as your account is active or as needed to provide you the Service. You may request deletion of your account and associated data at any time through the app or by contacting us. Upon deletion, we will remove your data within 30 days, except where retention is required by law.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>7. Your Rights</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Depending on your jurisdiction, you may have the right to:{'\n\n'}
          - Access, correct, or delete your personal data.{'\n'}
          - Object to or restrict certain processing of your data.{'\n'}
          - Port your data to another service.{'\n'}
          - Withdraw consent where processing is based on consent.{'\n\n'}
          To exercise any of these rights, please contact us at privacy@kamioi.com.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>8. Children's Privacy</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          The Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child under 18, we will take steps to delete such information promptly.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>9. Changes to This Policy</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy within the app and updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the updated policy.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>10. Contact Us</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          If you have any questions about this Privacy Policy, please contact us at:{'\n\n'}
          Email: privacy@kamioi.com{'\n'}
          Kamioi Inc.{'\n'}
          123 Innovation Way{'\n'}
          San Francisco, CA 94105
        </Text>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  updated: {
    fontSize: 13,
    marginBottom: 24,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
  },
})

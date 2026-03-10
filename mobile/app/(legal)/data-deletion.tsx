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

export default function DataDeletionScreen() {
  const { colors, brand, status: statusColors } = useTheme()
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
        <Text style={[styles.title, { color: colors.textPrimary }]}>Data Deletion Policy</Text>
        <Text style={[styles.updated, { color: colors.textMuted }]}>
          Last updated: March 1, 2026
        </Text>

        <Text style={[styles.body, { color: colors.textSecondary }]}>
          At Kamioi, we respect your right to control your personal data. This Data Deletion Policy explains how you can request the deletion of your data and what happens when you do.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>1. How to Request Data Deletion</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          You can request deletion of your account and personal data through any of the following methods:{'\n\n'}
          - In-App: Navigate to More {'>'} Delete My Data and follow the confirmation prompts.{'\n'}
          - Email: Send a request to privacy@kamioi.com from the email address associated with your account.{'\n'}
          - Mail: Send a written request to Kamioi Inc., 123 Innovation Way, San Francisco, CA 94105.{'\n\n'}
          We will verify your identity before processing any deletion request. Requests submitted via email or mail may require additional verification steps.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>2. What Data Will Be Deleted</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Upon a confirmed deletion request, we will permanently delete the following data:{'\n\n'}
          - Your user profile, including name, email, and account preferences.{'\n'}
          - All transaction records and round-up history.{'\n'}
          - Portfolio holdings and investment allocation data.{'\n'}
          - Uploaded receipt images and AI-extracted receipt data.{'\n'}
          - Receipt allocation records.{'\n'}
          - User settings and preferences.{'\n'}
          - AI mapping history and responses associated with your account.{'\n'}
          - Notification history.{'\n'}
          - Goal tracking data.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>3. Data Retention Exceptions</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Certain data may be retained even after an account deletion request in the following circumstances:{'\n\n'}
          - Legal obligations: We may be required to retain certain financial records for regulatory compliance (e.g., tax reporting, anti-money laundering regulations) for a period mandated by law.{'\n'}
          - Fraud prevention: Minimal data may be retained to prevent fraud or abuse of the Service.{'\n'}
          - Aggregated data: De-identified, aggregated data that cannot be linked back to you may be retained for analytical and improvement purposes.{'\n'}
          - Active disputes: If there is an ongoing dispute or legal proceeding, relevant data may be retained until resolution.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>4. Deletion Timeline</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          We will process your deletion request within the following timeline:{'\n\n'}
          - Acknowledgment: We will confirm receipt of your request within 3 business days.{'\n'}
          - Processing: Your data will be permanently deleted within 30 calendar days of the confirmed request.{'\n'}
          - Storage backups: Data in encrypted backups will be purged within 90 calendar days as backup rotation completes.{'\n\n'}
          During the processing period, your account will be deactivated and you will not be able to access the Service.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>5. Third-Party Data</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          When you delete your account, we will also request deletion of your data from third-party services where applicable, including:{'\n\n'}
          - Supabase (authentication and database records).{'\n'}
          - Cloud storage providers hosting your receipt images.{'\n'}
          - AI vision providers (note: these providers do not retain data beyond the processing session by default).{'\n\n'}
          We cannot guarantee deletion timelines for third-party services but will make commercially reasonable efforts to ensure your data is removed.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>6. Consequences of Deletion</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Please be aware that account deletion is permanent and irreversible. Once your data is deleted:{'\n\n'}
          - You will lose access to your portfolio, transaction history, and all account data.{'\n'}
          - Any pending round-ups or queued stock purchases will be canceled.{'\n'}
          - You will not be able to recover any deleted information.{'\n'}
          - If you wish to use Kamioi again, you will need to create a new account.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>7. California Residents (CCPA)</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information is collected, the right to delete your personal information, and the right to opt out of the sale of personal information. Kamioi does not sell personal information. To exercise your CCPA rights, contact us at privacy@kamioi.com.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>8. European Residents (GDPR)</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          If you are a resident of the European Economic Area, you have the right to erasure under the General Data Protection Regulation (GDPR). This right allows you to request the deletion of your personal data when it is no longer necessary for the purpose for which it was collected. To exercise your GDPR rights, contact our Data Protection Officer at dpo@kamioi.com.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>9. Contact Us</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          If you have questions about this Data Deletion Policy or need assistance with a deletion request, please contact us at:{'\n\n'}
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

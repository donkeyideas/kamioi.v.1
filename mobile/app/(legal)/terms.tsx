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

export default function TermsOfServiceScreen() {
  const { colors } = useTheme()
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
        <Text style={[styles.title, { color: colors.textPrimary }]}>Terms of Service</Text>
        <Text style={[styles.updated, { color: colors.textMuted }]}>
          Last updated: March 1, 2026
        </Text>

        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Please read these Terms of Service ("Terms") carefully before using the Kamioi mobile application and related services (the "Service") operated by Kamioi Inc. ("we," "us," or "our"). By accessing or using the Service, you agree to be bound by these Terms.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>1. Acceptance of Terms</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          By creating an account or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree, you may not use the Service. You must be at least 18 years old to use the Service.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>2. Description of Service</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Kamioi is a micro-investing platform that adds your chosen round-up amount to every purchase and invests it into stocks. The Service includes:{'\n\n'}
          - Automatic round-up calculations on linked bank transactions.{'\n'}
          - AI-powered merchant-to-stock-ticker mapping.{'\n'}
          - Receipt scanning and processing to allocate investments to brands you purchase.{'\n'}
          - Portfolio tracking and management.{'\n'}
          - Goal setting and investment tracking.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>3. Account Registration</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          You must provide accurate, complete, and current information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to notify us immediately of any unauthorized use of your account.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>4. Financial Services Disclaimer</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Kamioi is not a registered broker-dealer, investment advisor, or financial planner. The Service is provided for informational and educational purposes. Stock allocations based on round-ups and receipt processing are automated and do not constitute personalized investment advice. You should consult a qualified financial advisor before making investment decisions. Past performance does not guarantee future results. All investments carry risk, including the potential loss of principal.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>5. User Conduct</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          You agree not to:{'\n\n'}
          - Use the Service for any unlawful purpose or in violation of any applicable laws.{'\n'}
          - Attempt to gain unauthorized access to any part of the Service or its related systems.{'\n'}
          - Upload false, misleading, or fraudulent receipts or transaction data.{'\n'}
          - Interfere with or disrupt the Service or servers connected to the Service.{'\n'}
          - Reverse engineer, decompile, or disassemble any part of the Service.{'\n'}
          - Use automated systems or bots to access the Service without our express written permission.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>6. Intellectual Property</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          The Service, including its design, text, graphics, logos, and software, is owned by Kamioi Inc. and is protected by copyright, trademark, and other intellectual property laws. You are granted a limited, non-exclusive, non-transferable license to use the Service for personal, non-commercial purposes in accordance with these Terms.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>7. Third-Party Services</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          The Service integrates with third-party services including banking APIs, AI vision providers, and market data providers. We are not responsible for the availability, accuracy, or content of third-party services. Your use of third-party services is subject to their respective terms and privacy policies.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>8. Limitation of Liability</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, KAMIOI INC. SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR INVESTMENT RETURNS, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.{'\n\n'}
          Our total liability for any claim arising from the Service shall not exceed the amount you paid us in the twelve (12) months preceding the claim, or $100, whichever is greater.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>9. Indemnification</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          You agree to indemnify, defend, and hold harmless Kamioi Inc. and its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including reasonable attorney fees) arising out of your use of the Service or violation of these Terms.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>10. Termination</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          We may suspend or terminate your access to the Service at any time, with or without cause, with or without notice. Upon termination, your right to use the Service ceases immediately. You may delete your account at any time through the app settings or by contacting us.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>11. Governing Law</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          These Terms shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be resolved in the state or federal courts located in San Francisco County, California.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>12. Changes to Terms</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms within the app and updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the revised Terms.
        </Text>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>13. Contact Us</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          If you have any questions about these Terms, please contact us at:{'\n\n'}
          Email: legal@kamioi.com{'\n'}
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

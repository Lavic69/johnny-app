import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface Props {
  visible: boolean
  /** Ce qui est envoyé à OpenAI pour cette feature spécifique */
  dataDescription: string
  onAccept: () => void
  onDecline: () => void
}

/**
 * Modale de consentement IA — conforme à Apple Guideline 5.1.2(i) (nov. 2025)
 *
 * Obligations respectées :
 * - Nomme explicitement "OpenAI" comme fournisseur tiers
 * - Décrit les données envoyées
 * - Bouton Refuser accessible, pas caché
 * - Fonctions core restent disponibles si refus
 */
export default function AIConsentModal({ visible, dataDescription, onAccept, onDecline }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDecline}
    >
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} bounces={false}>
          {/* Icône */}
          <View style={styles.iconWrap}>
            <Ionicons name="sparkles" size={32} color="#3080ff" />
          </View>

          {/* Titre */}
          <Text style={styles.title}>Analyse par intelligence artificielle</Text>
          <Text style={styles.subtitle}>Partage de données avec un service tiers</Text>

          {/* Bloc disclosure principal */}
          <View style={styles.disclosureBox}>
            <Text style={styles.disclosureText}>
              Pour utiliser cette fonction, l'app envoie les données suivantes à{' '}
              <Text style={styles.bold}>OpenAI</Text> (openai.com), un service d'intelligence
              artificielle tiers basé aux États-Unis :
            </Text>
            <View style={styles.dataList}>
              <DataItem text={dataDescription} />
            </View>
            <Text style={styles.disclosureNote}>
              Ces données sont traitées par OpenAI conformément à leur{' '}
              <Text style={styles.link}>politique de confidentialité</Text> (platform.openai.com/privacy).
              Johnny App ne conserve pas les données envoyées à OpenAI.
            </Text>
          </View>

          {/* Ce que ça implique */}
          <View style={styles.infoCard}>
            <InfoRow
              icon="checkmark-circle"
              color="#00bb7f"
              text="Tu peux accepter et révoquer ce consentement à tout moment dans ton profil."
            />
            <InfoRow
              icon="close-circle"
              color="#ff8b1a"
              text="Si tu refuses, les fonctions d'analyse IA seront désactivées. Les autres fonctions de l'app restent accessibles."
            />
          </View>
        </ScrollView>

        {/* Boutons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.acceptText}>Accepter et continuer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineBtn} onPress={onDecline}>
            <Text style={styles.declineText}>Refuser</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

function DataItem({ text }: { text: string }) {
  return (
    <View style={styles.dataItem}>
      <View style={styles.dataDot} />
      <Text style={styles.dataText}>{text}</Text>
    </View>
  )
}

function InfoRow({ icon, color, text }: { icon: string; color: string; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={18} color={color} style={{ marginTop: 1 }} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },

  content: { padding: 24, paddingTop: 40, paddingBottom: 16 },

  iconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#3080ff15', borderWidth: 1, borderColor: '#3080ff30',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: 20,
  },

  title: {
    color: '#f8fafc', fontSize: 22, fontWeight: 'bold',
    textAlign: 'center', marginBottom: 6,
  },
  subtitle: {
    color: '#64748b', fontSize: 14,
    textAlign: 'center', marginBottom: 28,
  },

  disclosureBox: {
    backgroundColor: '#1e293b', borderRadius: 16,
    padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: '#334155',
  },
  disclosureText: { color: '#94a3b8', fontSize: 14, lineHeight: 22, marginBottom: 14 },
  bold: { color: '#f8fafc', fontWeight: '700' },
  link: { color: '#3080ff' },

  dataList: { marginBottom: 14 },
  dataItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  dataDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3080ff', marginTop: 7, flexShrink: 0 },
  dataText: { color: '#cbd5e1', fontSize: 14, lineHeight: 20, flex: 1 },

  disclosureNote: { color: '#475569', fontSize: 12, lineHeight: 18 },

  infoCard: {
    backgroundColor: '#1e293b', borderRadius: 16,
    padding: 16, gap: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#334155',
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoText: { color: '#94a3b8', fontSize: 13, lineHeight: 19, flex: 1 },

  actions: {
    padding: 20, paddingBottom: 36,
    borderTopWidth: 1, borderTopColor: '#1e293b', gap: 10,
  },
  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#3080ff', borderRadius: 14, padding: 16,
  },
  acceptText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  declineBtn: {
    alignItems: 'center', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#334155',
  },
  declineText: { color: '#64748b', fontSize: 15, fontWeight: '600' },
})

import jsPDF from 'jspdf'
import QRCode from 'qrcode'

interface VotingCard {
  studentId: string
  pin: string
  name: string
}

interface ResultsReport {
  electionName: string
  generatedAt: Date
  positions: Array<{
    title: string
    candidates: Array<{
      name: string
      voteCount: number
    }>
  }>
}

/**
 * Generate voting cards as PDF
 */
export async function generateVotingCardsPdf(cards: VotingCard[]): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  let cardIndex = 0
  const cardsPerPage = 4

  for (let i = 0; i < cards.length; i++) {
    if (cardIndex > 0 && cardIndex % cardsPerPage === 0) {
      doc.addPage()
    }

    const card = cards[i]
    const yPosition = 20 + (cardIndex % cardsPerPage) * 65

    // Add border
    doc.setDrawColor(0)
    doc.rect(10, yPosition, 190, 60)

    // Add header
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('VOTING CARD', 15, yPosition + 8)

    // Add student info
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text(`Name: ${card.name}`, 15, yPosition + 18)
    doc.text(`Student ID: ${card.studentId}`, 15, yPosition + 26)

    // Generate QR code
    const qrCode = await QRCode.toDataURL(`${card.studentId}:${card.pin}`)
    doc.addImage(qrCode, 'PNG', 140, yPosition + 10, 35, 35)

    // Add PIN
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text(`PIN: ${card.pin}`, 15, yPosition + 52)

    cardIndex++
  }

  return Buffer.from(doc.output('arraybuffer'))
}

/**
 * Generate election results report PDF
 */
export async function generateResultsPdf(report: ResultsReport): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // Header
  doc.setFontSize(18)
  doc.setFont(undefined, 'bold')
  const headerText = 'ELECTORAL COMMISSION DECLARATION OF RESULTS'
  const pageWidth = doc.internal.pageSize.getWidth()
  const textWidth = doc.getTextWidth(headerText)
  doc.text(headerText, (pageWidth - textWidth) / 2, 20)

  // Date
  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  doc.text(`Date: ${report.generatedAt.toLocaleDateString()}`, 20, 35)

  let yPosition = 50

  for (const position of report.positions) {
    // Check if we need a new page
    if (yPosition > 240) {
      doc.addPage()
      yPosition = 20
    }

    // Position title
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text(position.title, 20, yPosition)
    yPosition += 10

    // Table header
    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.text('Rank', 20, yPosition)
    doc.text('Candidate Name', 40, yPosition)
    doc.text('Votes', 150, yPosition)
    doc.line(20, yPosition + 2, 190, yPosition + 2)
    yPosition += 8

    // Sort candidates by vote count
    const sorted = [...position.candidates].sort((a, b) => b.voteCount - a.voteCount)

    // Candidates table
    doc.setFont(undefined, 'normal')
    sorted.forEach((candidate, index) => {
      doc.text(`${index + 1}`, 20, yPosition)
      doc.text(candidate.name, 40, yPosition)
      doc.text(candidate.voteCount.toString(), 150, yPosition)
      yPosition += 7
    })

    yPosition += 10
  }

  // Signature section at bottom
  const bottomY = doc.internal.pageSize.getHeight() - 40
  doc.setFontSize(11)
  doc.setFont(undefined, 'normal')
  doc.text('Approved by Chairperson, Electoral Commission', 20, bottomY)
  
  // Signature line
  doc.line(20, bottomY + 15, 100, bottomY + 15)
  doc.setFontSize(9)
  doc.text('Signature', 20, bottomY + 20)

  return Buffer.from(doc.output('arraybuffer'))
}

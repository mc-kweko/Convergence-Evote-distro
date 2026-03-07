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
  pollDate?: Date
  totalEligibleVoters: number
  totalVotesCast: number
  positions: Array<{
    title: string
    totalValidVotes: number
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
  const votingPortalUrl = 'https://v0-jinja-college-electoral-system-2.vercel.app/voting'

  for (let i = 0; i < cards.length; i++) {
    if (cardIndex > 0 && cardIndex % cardsPerPage === 0) {
      doc.addPage()
    }

    const card = cards[i]
    const yPosition = 20 + (cardIndex % cardsPerPage) * 65

    // Add border
    doc.setDrawColor(0)
    doc.setLineWidth(0.5)
    doc.rect(10, yPosition, 190, 60)

    // Add school badge
    try {
      const fs = require('fs')
      const path = require('path')
      const badgePath = path.join(process.cwd(), 'public', 'Jinja College badge.png')
      const badgeBase64 = fs.readFileSync(badgePath, 'base64')
      doc.addImage(`data:image/png;base64,${badgeBase64}`, 'PNG', 15, yPosition + 5, 20, 20)
    } catch (e) {
      // Skip if image not available
      console.error('Badge image not found:', e)
    }

    // Add header
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('JINJA COLLEGE VOTING CARD', 105, yPosition + 15, { align: 'center' })

    // Add student info
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text(`Name: ${card.name}`, 15, yPosition + 30)
    doc.text(`Student ID: ${card.studentId || 'N/A'}`, 15, yPosition + 38)

    // Generate QR code with voting portal URL
    const qrCode = await QRCode.toDataURL(votingPortalUrl, { width: 200 })
    doc.addImage(qrCode, 'PNG', 140, yPosition + 20, 40, 40)

    // Add PIN prominently
    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.text(`PIN: ${card.pin}`, 15, yPosition + 48)

    // Add instructions
    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    doc.text('Scan QR code or visit voting portal', 15, yPosition + 55)
    doc.text('Keep this PIN confidential', 15, yPosition + 60)

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

  // Add badge
  try {
    const fs = require('fs')
    const path = require('path')
    const badgePath = path.join(process.cwd(), 'public', 'Jinja College badge.png')
    const badgeBase64 = fs.readFileSync(badgePath, 'base64')
    doc.addImage(`data:image/png;base64,${badgeBase64}`, 'PNG', 15, 10, 25, 25)
  } catch (e) {
    console.error('Badge image not found:', e)
  }

  // Header
  doc.setFontSize(18)
  doc.setFont(undefined, 'bold')
  const pageWidth = doc.internal.pageSize.getWidth()
  const headerLine1 = 'ELECTORAL COMMISSION DECLARATION'
  const headerLine2 = 'OF RESULTS'
  doc.text(headerLine1, pageWidth / 2, 20, { align: 'center' })
  doc.text(headerLine2, pageWidth / 2, 28, { align: 'center' })

  // Date and Poll Information
  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  doc.text(`Declaration Date: ${report.generatedAt.toLocaleDateString()}`, 20, 45)
  if (report.pollDate) {
    doc.text(`Poll Date: ${report.pollDate.toLocaleDateString()}`, 20, 50)
  }

  // Turnout Summary Box
  let yPosition = report.pollDate ? 58 : 53
  doc.setFillColor(240, 240, 240)
  doc.rect(20, yPosition, 170, 20, 'F')
  doc.setDrawColor(100, 100, 100)
  doc.rect(20, yPosition, 170, 20)
  
  doc.setFontSize(9)
  doc.setFont(undefined, 'bold')
  doc.text('ELECTION TURNOUT SUMMARY', 105, yPosition + 5, { align: 'center' })
  doc.setFont(undefined, 'normal')
  const turnoutRate = report.totalEligibleVoters > 0 
    ? ((report.totalVotesCast / report.totalEligibleVoters) * 100).toFixed(1)
    : '0.0'
  doc.text(`Eligible Voters: ${report.totalEligibleVoters}`, 25, yPosition + 11)
  doc.text(`Votes Cast: ${report.totalVotesCast}`, 25, yPosition + 16)
  doc.text(`Turnout: ${turnoutRate}%`, 120, yPosition + 11)
  
  yPosition += 28

  for (const position of report.positions) {
    // Check if we need a new page
    if (yPosition > 220) {
      doc.addPage()
      yPosition = 20
    }

    // Position title
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text(position.title.toUpperCase(), 20, yPosition)
    yPosition += 7

    // Sort candidates by vote count
    const sorted = [...position.candidates].sort((a, b) => b.voteCount - a.voteCount)
    const totalVotes = position.totalValidVotes || sorted.reduce((sum, c) => sum + c.voteCount, 0)

    // Table header with borders
    doc.setFillColor(220, 220, 220)
    doc.rect(20, yPosition, 170, 8, 'F')
    doc.setDrawColor(100, 100, 100)
    doc.setLineWidth(0.3)
    
    // Header borders
    doc.rect(20, yPosition, 15, 8) // Rank
    doc.rect(35, yPosition, 85, 8) // Name
    doc.rect(120, yPosition, 25, 8) // Votes
    doc.rect(145, yPosition, 25, 8) // Percentage
    doc.rect(170, yPosition, 20, 8) // Status
    
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text('Rank', 27.5, yPosition + 5.5, { align: 'center' })
    doc.text('Candidate Name', 37, yPosition + 5.5)
    doc.text('Votes', 132.5, yPosition + 5.5, { align: 'center' })
    doc.text('Percentage', 157.5, yPosition + 5.5, { align: 'center' })
    doc.text('Status', 180, yPosition + 5.5, { align: 'center' })
    yPosition += 8

    // Candidates rows
    doc.setFont(undefined, 'normal')
    sorted.forEach((candidate, index) => {
      const percentage = totalVotes > 0 ? ((candidate.voteCount / totalVotes) * 100).toFixed(1) : '0.0'
      const isWinner = index === 0
      
      // Alternate row colors
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250)
        doc.rect(20, yPosition, 170, 7, 'F')
      }
      
      // Row borders
      doc.rect(20, yPosition, 15, 7)
      doc.rect(35, yPosition, 85, 7)
      doc.rect(120, yPosition, 25, 7)
      doc.rect(145, yPosition, 25, 7)
      doc.rect(170, yPosition, 20, 7)
      
      // Content
      doc.text(`${index + 1}`, 27.5, yPosition + 5, { align: 'center' })
      doc.text(candidate.name, 37, yPosition + 5)
      doc.text(candidate.voteCount.toString(), 132.5, yPosition + 5, { align: 'center' })
      doc.text(`${percentage}%`, 157.5, yPosition + 5, { align: 'center' })
      
      if (isWinner) {
        doc.setFont(undefined, 'bold')
        doc.text('✓', 180, yPosition + 5, { align: 'center' })
        doc.setFont(undefined, 'normal')
      }
      
      yPosition += 7
    })

    // Total row
    doc.setFillColor(240, 240, 240)
    doc.rect(20, yPosition, 170, 7, 'F')
    doc.rect(20, yPosition, 15, 7)
    doc.rect(35, yPosition, 85, 7)
    doc.rect(120, yPosition, 25, 7)
    doc.rect(145, yPosition, 25, 7)
    doc.rect(170, yPosition, 20, 7)
    
    doc.setFont(undefined, 'bold')
    doc.text('TOTAL', 37, yPosition + 5)
    doc.text(totalVotes.toString(), 132.5, yPosition + 5, { align: 'center' })
    doc.text('100.0%', 157.5, yPosition + 5, { align: 'center' })
    doc.setFont(undefined, 'normal')
    
    yPosition += 15
  }

  // Signature section at bottom
  const bottomY = doc.internal.pageSize.getHeight() - 40
  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  doc.text('Approved by Chairperson, Electoral Commission', 20, bottomY)
  
  // Signature line
  doc.line(20, bottomY + 15, 100, bottomY + 15)
  doc.setFontSize(9)
  doc.text('Signature', 20, bottomY + 20)
  doc.text('Date: _______________', 120, bottomY + 20)

  return Buffer.from(doc.output('arraybuffer'))
}

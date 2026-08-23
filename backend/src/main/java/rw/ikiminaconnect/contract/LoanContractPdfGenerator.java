package rw.ikiminaconnect.contract;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;
import rw.ikiminaconnect.loan.Loan;
import rw.ikiminaconnect.member.AppUser;
import rw.ikiminaconnect.organization.Organization;

/**
 * Ports src/pages/LoanContract.tsx article-for-article — same Kinyarwanda
 * text, same conditional articles (insurance/guarantor clauses only appear
 * when insuranceRequired), same ordering. This is a real legal document
 * template grounded in APUPEKA's actual contracts (see the
 * apupeka_real_documents project memory) — faithfulness to the source
 * mattered more here than anywhere else in the backend, so every string
 * below should read as a direct transcription, not a paraphrase.
 *
 * <p>One unit-conversion detail worth flagging: the frontend's
 * {@code loan.interestRate} is stored as a whole percentage (e.g. {@code 5}),
 * so it divides by 100 before using it in the interest calculation. This
 * backend stores rates as fractions (e.g. {@code 0.05}) instead (see
 * Organization's schema comment), so the Java version multiplies directly —
 * same arithmetic result, different starting representation.
 */
@Component
public class LoanContractPdfGenerator {

    private static final Font TITLE_FONT = new Font(Font.HELVETICA, 13, Font.BOLD);
    private static final Font ORG_NAME_FONT = new Font(Font.HELVETICA, 8, Font.BOLD, new Color(90, 90, 90));
    private static final Font BODY_FONT = new Font(Font.HELVETICA, 10, Font.NORMAL);
    private static final Font ARTICLE_HEADING_FONT = new Font(Font.HELVETICA, 9, Font.BOLD);
    private static final Font SMALL_FONT = new Font(Font.HELVETICA, 8, Font.NORMAL, new Color(110, 110, 110));
    private static final Font SIGNATURE_LABEL_FONT = new Font(Font.HELVETICA, 8, Font.NORMAL, new Color(110, 110, 110));
    private static final Font SIGNATURE_NAME_FONT = new Font(Font.HELVETICA, 9, Font.BOLD);

    private record ArticleSection(String title, List<String> paragraphs) {
        ArticleSection(String title, String singleParagraph) {
            this(title, List.of(singleParagraph));
        }
    }

    public byte[] generate(
            Loan loan, AppUser member, Organization organization, List<GuarantorInfo> guarantors, BigDecimal memberSavings) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 56, 56, 50, 50);
        try {
            PdfWriter.getInstance(document, out);
            document.open();

            addHeader(document, loan, member, organization);
            List<ArticleSection> articles = buildArticles(loan, member, organization, guarantors, memberSavings);
            for (int i = 0; i < articles.size(); i++) {
                addArticle(document, articles.get(i), i);
            }
            addFooter(document, loan, organization);
            addSignatures(document, loan, member, organization, guarantors);
            addContractFooterLine(document, loan, organization);

            document.close();
        } catch (DocumentException e) {
            throw new IllegalStateException("Failed to generate loan contract PDF.", e);
        }
        return out.toByteArray();
    }

    private void addHeader(Document document, Loan loan, AppUser member, Organization organization) throws DocumentException {
        Paragraph orgName = new Paragraph(organization.getName().toUpperCase(Locale.ROOT), ORG_NAME_FONT);
        orgName.setAlignment(Element.ALIGN_CENTER);
        document.add(orgName);

        String suffix = loan.isInsuranceRequired() ? "Wishingiwe" : "— Isanzwe";
        Paragraph title = new Paragraph(
                "AMASEZERANO Y'INGUZANYO IHABWA UMUNYAMURYANGO " + suffix.toUpperCase(Locale.ROOT), TITLE_FONT);
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingAfter(14);
        document.add(title);

        Paragraph intro = new Paragraph(
                "Aya masezerano y'inguzanyo akozwe hagati ya %s ufite ID:%s, UMUNYAMURYANGO wa %s na “%s” ihagarariwe na %s %s."
                        .formatted(member.getFullName(), member.getNationalId(), organization.getName(),
                                organization.getShortName(), organization.getLegalRepresentativeTitle(),
                                organization.getLegalRepresentativeName()),
                BODY_FONT);
        intro.setSpacingAfter(12);
        document.add(intro);
    }

    private List<ArticleSection> buildArticles(
            Loan loan, AppUser member, Organization organization, List<GuarantorInfo> guarantors, BigDecimal memberSavings) {
        List<ArticleSection> articles = new ArrayList<>();
        String org = organization.getShortName();

        String bankLine = (member.getBankName() != null && member.getBankAccountNumber() != null)
                ? "anyujijwe kuri Konti ye N°%s iri muri %s".formatted(member.getBankAccountNumber(), member.getBankName())
                : "azahabwa mu buryo bwemejwe na Komite y'Inguzanyo";
        articles.add(new ArticleSection("AMAFARANGA AGURIJWE",
                "%s igurije %s amafaranga (%s), %s.".formatted(org, member.getFullName(), formatRwf(loan.getAmount()), bankLine)));

        BigDecimal interestAmount = loan.getAmount().multiply(loan.getInterestRate()).setScale(0, RoundingMode.HALF_UP);
        articles.add(new ArticleSection("INYUNGU KU NGUZANYO",
                "Uhawe inguzanyo yemeye kwishyura inyungu ingana na %s%% ku mwaka ihwanye na (%s) akurwa mbere ku nguzanyo ahawe."
                        .formatted(asPercent(loan.getInterestRate()), formatRwf(interestAmount))));

        if (loan.isInsuranceRequired()) {
            articles.add(new ArticleSection("UBWISHINGIZI",
                    "Uhawe inguzanyo irengeje ubwizigame afitemo yemeye gukatwa %s%% by'inguzanyo yose ahawe nk'ubwishingizi buhwanye na (%s) ayo mafaranga akazajya aguma mu isanduku ya %s akazishingira ibiteganwa n'amategeko ngengamikorere."
                            .formatted(asPercent(organization.getLoanInsuranceRate()), formatRwf(loan.getInsuranceFee()), org)));
        }

        articles.add(new ArticleSection("IGIHE CYO KWISHYURA UMWENDA",
                "Umunyamuryango uhawe iyi nguzanyo azishyura mu gihe kitarenze amezi %s (%d)."
                        .formatted(KinyarwandaText.periodWordsRw(loan.getPeriodMonths()), loan.getPeriodMonths())));

        LocalDate disbursementBasis = loan.getApprovedDate() != null ? loan.getApprovedDate() : loan.getAppliedDate();
        String startMonth = KinyarwandaText.monthYearRw(disbursementBasis);
        String endMonth = KinyarwandaText.monthYearRw(
                KinyarwandaText.plusMonthsInclusive(disbursementBasis, loan.getPeriodMonths()));
        articles.add(new ArticleSection("AMAFARANGA AZISHYURWA BURI KWEZI",
                "%s yemeye kujya akurwa ku mushahara we amafaranga (%s) buri kwezi, yo kwishyura umwenda afashe muri %s kuva mu kwezi kwa %s kugeza mu kwezi kwa %s. Igihe habayeho kudakatwa umunyamuryango afite inshingano zo gushyira kuri konti ya %s amafaranga atakaswe kandi agahita abimenyesha ubuyobozi bwa %s."
                        .formatted(member.getFullName(), formatRwf(loan.getMonthlyInstallment()), org, startMonth,
                                endMonth, org, org)));

        articles.add(new ArticleSection("UBWIZIGAME",
                "%s yizigamiye muri %s amafaranga (%s) kugeza kuri uyu munsi."
                        .formatted(member.getFullName(), org, formatRwf(memberSavings))));

        if (loan.isInsuranceRequired() && !guarantors.isEmpty()) {
            List<String> guarantorParagraphs = guarantors.stream()
                    .map(g -> "%s, ufite ID:%s Telephone:%s Umunyamuryango wa %s yemeye kwishingira uhawe inguzanyo ariwe %s ID:%s. Yishingiye ko naramuka atishyuye inguzanyo ahawe ingana n'amafaranga (%s), ariwe uzayishyura bahereye ku bwizigame afite muri %s bungana na %s."
                            .formatted(g.fullName(), g.nationalId(), g.phone(), org, member.getFullName(),
                                    member.getNationalId(), formatRwf(loan.getAmount()), org, formatRwf(g.amountGuaranteed())))
                    .toList();
            articles.add(new ArticleSection("UMWISHINGIZI", guarantorParagraphs));

            articles.add(new ArticleSection("KUREKA KUBA UMUNYAMURYANGO KU MWISHINGIZI",
                    "Nta mwishingizi wemerewe kureka kuba umunyamuryango mu gihe uwo wishingiye atararangiza kwishyura inguzanyo yahawe."));
        }

        articles.add(new ArticleSection("IMPAKA ZAVUKA", List.of(
                "Impaka zose zavuka hagati y'umunyamuryango, umwishingizi zakemurwa n'inzego:",
                "1. Ubuyobozi bwa " + org + ".",
                "2. Komite Nkemurampaka.",
                "3. Inteko Rusange ya " + org + ".")));

        articles.add(new ArticleSection("INGINGO ZISOZA",
                "%s yemeye ko mu gihe atakiri umunyamuryango wa %s, kandi agifite umwenda agomba kuwishyura mu gihe cyagenwe, bitaba ibyo hagafatirwa imigabane ye%s."
                        .formatted(member.getFullName(), org, loan.isInsuranceRequired() ? " ndetse n'umwishingizi we" : "")));

        return articles;
    }

    private void addArticle(Document document, ArticleSection article, int index) throws DocumentException {
        String ordinal = index == 0 ? "Mbere" : String.valueOf(index + 1);
        Paragraph heading = new Paragraph("Ingingo ya %s: %s".formatted(ordinal, article.title()), ARTICLE_HEADING_FONT);
        heading.setSpacingBefore(8);
        heading.setSpacingAfter(3);
        document.add(heading);

        for (String paragraphText : article.paragraphs()) {
            Paragraph body = new Paragraph(paragraphText, BODY_FONT);
            body.setAlignment(Element.ALIGN_JUSTIFIED);
            body.setSpacingAfter(2);
            document.add(body);
        }
    }

    private void addFooter(Document document, Loan loan, Organization organization) throws DocumentException {
        LocalDate contractDateBasis = loan.getApprovedDate() != null ? loan.getApprovedDate() : loan.getAppliedDate();
        Paragraph footer = new Paragraph(
                "Bikorewe %s, %s".formatted(organization.getDistrict(), KinyarwandaText.formatDateRw(contractDateBasis)),
                SMALL_FONT);
        footer.setSpacingBefore(16);
        document.add(footer);
    }

    private void addSignatures(
            Document document, Loan loan, AppUser member, Organization organization, List<GuarantorInfo> guarantors)
            throws DocumentException {
        List<String[]> blocks = new ArrayList<>();
        blocks.add(new String[] {member.getFullName(), "Izina n'Umukono by'Umunyamuryango Ugurijwe"});
        for (GuarantorInfo g : guarantors) {
            blocks.add(new String[] {g.fullName(), "Izina n'Umukono by'Umwishingizi"});
        }
        blocks.add(new String[] {
                "%s wa %s: %s".formatted(organization.getLegalRepresentativeTitle(), organization.getShortName(),
                        organization.getLegalRepresentativeName()),
                "Umukono w'Uhagarariye " + organization.getShortName()});

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setSpacingBefore(20);
        for (String[] block : blocks) {
            PdfPCell cell = new PdfPCell();
            cell.setBorder(0);
            cell.setPaddingBottom(14);
            cell.setPaddingRight(16);
            Paragraph line = new Paragraph(" \n", BODY_FONT);
            Paragraph rule = new Paragraph("――――――――――――――――", SMALL_FONT);
            Paragraph name = new Paragraph(block[0], SIGNATURE_NAME_FONT);
            Paragraph label = new Paragraph(block[1], SIGNATURE_LABEL_FONT);
            cell.addElement(line);
            cell.addElement(rule);
            cell.addElement(name);
            cell.addElement(label);
            table.addCell(cell);
        }
        if (blocks.size() % 2 != 0) {
            PdfPCell blank = new PdfPCell();
            blank.setBorder(0);
            table.addCell(blank);
        }
        document.add(table);
    }

    private void addContractFooterLine(Document document, Loan loan, Organization organization) throws DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setSpacingBefore(28);

        PdfPCell contractNumberCell = new PdfPCell(new Paragraph("Contract No. " + loan.getContractNumber(), SMALL_FONT));
        contractNumberCell.setBorder(0);
        contractNumberCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        table.addCell(contractNumberCell);

        PdfPCell stampCell = new PdfPCell(new Paragraph(organization.getStampLabel(), SMALL_FONT));
        stampCell.setBorder(PdfPCell.BOX);
        stampCell.setBorderColor(new Color(180, 180, 180));
        stampCell.setPadding(8);
        stampCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        table.addCell(stampCell);

        document.add(table);
    }

    private static String asPercent(BigDecimal fraction) {
        return fraction.multiply(BigDecimal.valueOf(100)).stripTrailingZeros().toPlainString();
    }

    private static String formatRwf(BigDecimal amount) {
        NumberFormat format = NumberFormat.getIntegerInstance(Locale.US);
        return "RWF " + format.format(amount.setScale(0, RoundingMode.HALF_UP));
    }
}

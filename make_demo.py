from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib import colors

out = Path(__file__).parent / 'test-fixtures'
out.mkdir(exist_ok=True)

def generate(revision):
    c = canvas.Canvas(str(out / f'fictional-revision-{revision}.pdf'), pagesize=(842, 595), invariant=1)
    c.setTitle(f'Fictional training drawing and parts report - revision {revision}')
    c.setAuthor('Revision Lens fictional test fixture')
    c.setStrokeColor(colors.HexColor('#273746'))
    c.setFillColor(colors.HexColor('#273746'))
    c.setLineWidth(.7)
    c.rect(22, 22, 798, 551)
    c.setFont('Helvetica-Bold', 17)
    c.drawString(45, 542, 'SUPPORT BRACKET / DEMONSTRATION DRAWING')
    c.setFont('Helvetica', 9)
    c.drawString(45, 523, 'Fictional geometry. Not for manufacture. Dimensions in mm.')
    c.setLineWidth(1.4)
    c.rect(150, 185, 430, 245)
    c.setLineWidth(.9)
    for x in [185, 545]:
        for y in [220, 395]:
            c.circle(x, y, 13 if revision=='A' else 18)
            c.setDash(3, 3)
            c.line(x-23, y, x+23, y)
            c.line(x, y-23, x, y+23)
            c.setDash()
    c.rect(290, 270, 120, 75)
    if revision=='B':
        c.roundRect(450, 285, 70, 35, 17)
        c.line(520, 302, 640, 350)
        c.setFont('Helvetica', 11)
        c.drawString(645, 349, 'NEW SLOT 35 x 70')
    c.setLineWidth(.6)
    c.line(150, 170, 150, 135)
    c.line(580, 170, 580, 135)
    c.line(150, 145, 580, 145)
    for x in [150,580]:
        c.line(x-4,141,x+4,149)
    c.setFont('Helvetica', 12)
    c.setFillColor(colors.white)
    c.rect(345,137,40,17,fill=1,stroke=0)
    c.setFillColor(colors.HexColor('#273746'))
    c.drawString(350, 141, '430' if revision=='A' else '435')
    c.setFont('Helvetica', 10)
    c.drawString(620, 420, '4 x DIA 26 THRU' if revision=='A' else '4 x DIA 36 THRU')
    c.drawString(620, 400, 'DEBURR ALL EDGES')
    c.drawString(620, 380, 'FINISH: ZINC' if revision=='A' else 'FINISH: POWDER COAT')
    c.rect(505,22,315,65)
    c.line(505,54,820,54)
    c.setFont('Helvetica-Bold',10)
    c.drawString(516,66,'PART: DEMO-1042')
    c.drawString(516,35,'REVISION: '+revision)
    c.setFont('Helvetica',9)
    c.drawString(660,35,'PAGE 1 / 2')
    c.drawString(45,40,'FICTIONAL SAMPLE - Generated for software evaluation')
    c.showPage()
    c.setFillColor(colors.HexColor('#273746'))
    c.setFont('Helvetica-Bold',18)
    c.drawString(45,540,'PART REPORT / FICTIONAL ASSEMBLY')
    c.setFont('Helvetica',10)
    c.drawString(45,518,'Assembly DEMO-1042 | Revision '+revision+' | Fictional test data')
    widths=[45,110,250,470,560,700,795]
    headers=['Item','Part number','Description','Qty','Material','Finish']
    rows=[['10','DEMO-100','Support bracket','1','Steel','Zinc'],['20','DEMO-200','Hex bolt M12','4','Steel','Zinc'],['30','DEMO-300','Plain washer','4','Steel','Zinc']]
    if revision=='B':
        rows[0][-1]='Powder coat'
        rows[1][3]='6'
        rows.append(['40','DEMO-400','Lock nut M12','6','Steel','Zinc'])
    c.setFillColor(colors.HexColor('#edf3f6'))
    c.rect(45,460,750,32,fill=1,stroke=0)
    c.setFillColor(colors.HexColor('#273746'))
    c.setFont('Helvetica-Bold',10)
    for i,label in enumerate(headers): c.drawString(widths[i]+7,472,label)
    c.setFont('Helvetica',10)
    for idx,row in enumerate(rows):
        y=438-idx*35
        for i,text in enumerate(row): c.drawString(widths[i]+7,y,text)
    c.setStrokeColor(colors.HexColor('#bdcbd3'))
    for x in widths:c.line(x,320,x,492)
    for y in [492,460,425,390,355,320]:c.line(45,y,795,y)
    c.setFont('Helvetica',10)
    c.drawString(45,270,'Review targets: finish changed, quantity changed, and one new part row in revision B.')
    c.drawString(45,45,'FICTIONAL SAMPLE - No customer or proprietary data. Page 2 / 2.')
    c.save()

generate('A')
generate('B')
print('Created two fictional 2-page PDF fixtures.')

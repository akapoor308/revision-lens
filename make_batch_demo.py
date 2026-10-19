"""Fictional multi-page fixtures, including the user's 19 -> 20 example."""
from pathlib import Path
import shutil
import subprocess
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader

root=Path(__file__).parent
out=root/'test-fixtures'
out.mkdir(exist_ok=True)
names=['Baseplate mounting','Motor housing','Input shaft','Bearing carrier','Sealing flange','Drive coupling','Spacer assembly','Retaining plate','Lubrication manifold','Support bracket','Inspection cover','Cooling duct','Fastener schedule','Terminal enclosure','Alignment fixture','Guard panel','Transport cradle','Packaging schedule','Final inspection']

def sheet(c,identity,position,total,revised=False):
    key=identity if isinstance(identity,int) else 77
    name=names[identity-1] if isinstance(identity,int) else 'Cable guide - new assembly'
    c.setStrokeColor(colors.HexColor('#303747'));c.setFillColor(colors.HexColor('#303747'));c.setLineWidth(.7)
    c.rect(25,25,792,545)
    c.setFont('Helvetica-Bold',17);c.drawString(45,537,name.upper())
    c.setFont('Helvetica',10);c.drawString(45,516,f'Assembly identity DEMO-{1000+key} | Fictional training data | Not for manufacture')
    if key in (13,18):
        headings=['Part number','Description','Quantity','Material']
        xs=[53,210,465,600]
        c.setFillColor(colors.HexColor('#f1f4f7'));c.rect(45,447,740,34,fill=1,stroke=0);c.setFillColor(colors.HexColor('#303747'));c.setFont('Helvetica-Bold',11)
        for x,s in zip(xs,headings):c.drawString(x,460,s)
        c.setFont('Helvetica',10)
        for i in range(8):
            y=423-i*33
            row=[f'PART-{key}-{i+1:02d}',f'{name.split()[0]} component {i+1}',str(8 if revised and key==13 and i==2 else i+1),'Steel' if i%2 else 'Aluminium']
            for x,s in zip(xs,row):c.drawString(x,y,s)
            c.line(45,y-10,785,y-10)
    else:
        x0,y0=155,170;w=260+key*7%210;h=135+key*13%130
        c.setLineWidth(1.4)
        if key==77:
            c.roundRect(215,220,330,95,36);c.roundRect(250,245,260,42,19)
            c.circle(175,270,22);c.circle(585,270,22)
        else:
            c.rect(x0,y0,w,h)
            for j in range(2+key%5):
                x=x0+35+j*(w-70)/(1+key%5)
                c.circle(x,y0+30+(j%2)*(h-60),9+key%11+(4 if revised and key==8 else 0))
            c.line(x0+35,y0+h*.55,x0+w*.7,y0+h*.55)
            if key%2:c.rect(x0+w*.3,y0+h*.3,45+key,25+key)
            else:c.circle(x0+w*.5,y0+h*.5,25+key)
        c.setFont('Helvetica',12)
        dim=200+key*11+(5 if revised and key==8 else 0)
        c.drawString(165,140,f'Overall dimension: {dim} mm')
        c.setFont('Helvetica',10)
        for j,word in enumerate(name.split()):c.drawString(620,420-j*25,f'{word.upper()}-{key}-{j}')
        c.drawString(45,465,f'Component group: {name}. Geometry reference FEATURE-{key}-X{key*3}.')
    c.setFont('Helvetica',9)
    c.drawString(45,65,f'Stable identifier: DEMO-{1000+key} | Review {name.lower()} details')
    c.drawString(45,42,'FICTIONAL EXAMPLE - software evaluation only')
    c.drawRightString(800,42,f'Page {position} / {total}')
    c.showPage()

def make(filename,sequence,revised=False):
    c=canvas.Canvas(str(out/filename),pagesize=(842,595),invariant=1)
    c.setTitle('Revision Lens fictional sheet-matching test')
    for p,identity in enumerate(sequence,1):sheet(c,identity,p,len(sequence),revised)
    c.save()

base=list(range(1,20))
make('fictional-stack-19.pdf',base)
make('fictional-stack-20.pdf',base[:4]+['new']+base[4:],True)
make('fictional-stack-mixed-19.pdf',[i for i in base[:4]+['new']+base[4:] if i!=12],True)
make('fictional-stack-deleted-18.pdf',[i for i in base if i!=5],True)
c=canvas.Canvas(str(out/'fictional-blank-2.pdf'),pagesize=(842,595),invariant=1)
for _ in range(2):c.showPage()
c.save()
c=canvas.Canvas(str(out/'fictional-blank-3.pdf'),pagesize=(842,595),invariant=1)
for _ in range(3):c.showPage()
c.save()

# Pure-image PDFs exercise matching without extractable text or OCR.
poppler=shutil.which('pdftoppm')
if not poppler:raise RuntimeError('pdftoppm is required to regenerate scan fixtures')
scratch=root/'batch-fixture-images'
scratch.mkdir(exist_ok=True)
for identity in [1,2,3,4,'new']:
    source=scratch/f'{identity}.pdf'
    c=canvas.Canvas(str(source),pagesize=(842,595),invariant=1);sheet(c,identity,1,1);c.save()
    subprocess.run([poppler,'-f','1','-singlefile','-scale-to','1400','-png',str(source),str(scratch/str(identity))],check=True,capture_output=True)
for filename,sequence in [('fictional-scan-4.pdf',[1,2,3,4]),('fictional-scan-5.pdf',[1,2,'new',3,4])]:
    c=canvas.Canvas(str(out/filename),pagesize=(842,595),invariant=1)
    for identity in sequence:c.drawImage(ImageReader(str(scratch/f'{identity}.png')),0,0,width=842,height=595);c.showPage()
    c.save()
print('Created 8 fictional matching fixtures (19/20 sheets, mixed/deleted, blank and scanned).')

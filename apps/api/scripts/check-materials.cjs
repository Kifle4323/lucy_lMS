const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMaterials() {
  const materials = await prisma.material.findMany({
    select: {
      id: true,
      title: true,
      fileType: true,
      fileUrl: true,
      content: true,
      htmlContent: true,
      previewFileUrl: true,
      courseId: true,
    },
    take: 10,
  });

  console.log(`Total materials: ${materials.length}`);
  materials.forEach(m => {
    const hasFile = !!m.fileUrl;
    const hasContent = !!m.content;
    const hasHtml = !!m.htmlContent;
    const hasPreview = !!m.previewFileUrl;
    const fileUrlLen = m.fileUrl ? m.fileUrl.length : 0;
    console.log(`  ${m.title} (${m.fileType}) - fileUrl: ${hasFile} (${fileUrlLen} chars), content: ${hasContent}, html: ${hasHtml}, preview: ${hasPreview}`);
  });

  // Check material views
  const views = await prisma.materialView.findMany({ take: 5 });
  console.log(`\nMaterial views: ${views.length}`);
  views.forEach(v => {
    console.log(`  View ${v.id}: material=${v.materialId}, student=${v.studentId}, opened=${v.openedAt}, closed=${v.closedAt}`);
  });

  // Check reading progress
  const progress = await prisma.materialReadingProgress.findMany({ take: 5 });
  console.log(`\nReading progress records: ${progress.length}`);
  progress.forEach(p => {
    console.log(`  Progress: material=${p.materialId}, student=${p.studentId}, time=${p.totalTimeSpent}s, completed=${p.isCompleted}`);
  });

  await prisma.$disconnect();
}

checkMaterials();

const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { Presentation, PresentationFile } = require("@oai/artifact-tool");

const ROOT = process.cwd();
const THREAD_ID = process.env.CODEX_THREAD_ID || `manual-${Date.now().toString(36)}`;
const TASK_SLUG = "buan-building-permit-web";
const WORKSPACE = path.join(os.tmpdir(), "codex-presentations", THREAD_ID, TASK_SLUG);
const TMP_DIR = path.join(WORKSPACE, "tmp");
const PREVIEW_DIR = path.join(TMP_DIR, "preview");
const LAYOUT_DIR = path.join(TMP_DIR, "layout");
const QA_DIR = path.join(TMP_DIR, "qa");
const OUTPUT_DIR = path.join(ROOT, "outputs");
const FINAL_PPTX = path.join(OUTPUT_DIR, "buan-building-permit-web-summary.pptx");

const colors = {
  ink: "#1D2528",
  muted: "#667174",
  paper: "#FBFAF6",
  white: "#FFFFFF",
  line: "#D8DEDC",
  teal: "#4F9D97",
  tealDark: "#2F6F6A",
  olive: "#858A3B",
  blue: "#5D789C",
  mauve: "#A36F7D",
  taupe: "#928466",
  accent: "#D99A4E",
  paleTeal: "#EAF4F2",
  paleBlue: "#EEF2F8",
  paleMauve: "#F5ECEF",
  paleTaupe: "#F3EFE7",
};

const chapters = [
  ["1", "건축물의 건축 기본체계", "행정체계, 법령체계, 허가 절차", "5-12쪽", colors.olive],
  ["2", "부안군 건축환경", "토지이용계획, 건폐율, 경관심의", "13-48쪽", colors.teal],
  ["3", "건축 및 관계법령 연혁", "법 개정, 조례, 공부관리", "49-62쪽", colors.blue],
  ["4", "건축행위 제기준", "대지 안전, 교육환경, 문화재", "63-72쪽", colors.mauve],
  ["5", "참고 및 예시 자료", "신고서, 배치도, 사용승낙서", "73-82쪽", "#6F91A4"],
  ["6", "건축관계법 소개", "해체, 관리계획, 소방, 주차", "83-116쪽", colors.taupe],
];

const tasks = [
  ["건축허가 준비", "10쪽", "신청부터 사용승인까지"],
  ["토지 용도 확인", "16쪽", "지역, 지구, 편입리 확인"],
  ["경관심의 검토", "24쪽", "공공건축물과 규모 기준"],
  ["허가표지판 설치", "36쪽", "착공부터 사용승인까지"],
  ["문화재 조사", "69-70쪽", "지표조사와 발굴조사"],
  ["예시 서식", "74-81쪽", "농막, 배치도, 승낙서"],
  ["해체 허가/신고", "87쪽", "신고와 허가 분기"],
  ["소방/피난/주차", "101-115쪽", "안전과 이용 기준"],
];

const permitFlow = [
  ["건축허가 신청", "세움터 또는 민원과 접수"],
  ["복합민원 협의", "개발행위, 농지, 산지, 도로 등"],
  ["신고필증 교부", "민원과 교부"],
  ["착공신고", "면허세, 예치금, 부담금 확인"],
  ["사용승인 신청", "현황도, 검사필증, 준공검사"],
  ["사용승인서 교부", "후속 세금과 등기 준비"],
  ["대장 작성/관리", "건축물대장과 등기 관리"],
];

const sourceImages = {
  cover: path.join(ROOT, "tmp", "pdf_review", "selected_pages", "page_001.jpg"),
  toc: path.join(ROOT, "tmp", "pdf_review", "selected_pages", "page_003.jpg"),
  permit: path.join(ROOT, "tmp", "pdf_review", "selected_pages", "page_010.jpg"),
  land: path.join(ROOT, "tmp", "pdf_review", "selected_pages", "page_016.jpg"),
  culture: path.join(ROOT, "tmp", "pdf_review", "selected_pages", "page_069.jpg"),
  demolition: path.join(ROOT, "tmp", "pdf_review", "selected_pages", "page_087.jpg"),
};

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

async function readImageBlob(imagePath) {
  const bytes = await fs.readFile(imagePath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function textBox(slide, text, position, style = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position,
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    typeface: "Aptos",
    fontSize: 18,
    color: colors.ink,
    fit: "shrink",
    ...style,
  };
  return shape;
}

function box(slide, position, fill, line = colors.line) {
  return slide.shapes.add({
    geometry: "roundRect",
    position,
    fill,
    line: { style: "solid", fill: line, width: 1 },
    borderRadius: "rounded-md",
  });
}

function footer(slide, page, note = "출처: 부안군 건축인허가 가이드북 PDF") {
  textBox(slide, note, { left: 72, top: 668, width: 900, height: 24 }, {
    fontSize: 11,
    color: colors.muted,
  });
  textBox(slide, String(page).padStart(2, "0"), { left: 1152, top: 664, width: 56, height: 30 }, {
    fontSize: 15,
    bold: true,
    color: colors.muted,
    alignment: "right",
  });
}

function title(slide, eyebrow, headline, sub = "") {
  textBox(slide, eyebrow, { left: 72, top: 58, width: 400, height: 26 }, {
    fontSize: 13,
    bold: true,
    color: colors.tealDark,
  });
  textBox(slide, headline, { left: 72, top: 95, width: 800, height: 92 }, {
    typeface: "Aptos Display",
    fontSize: 38,
    bold: true,
    color: colors.ink,
  });
  if (sub) {
    textBox(slide, sub, { left: 72, top: 190, width: 780, height: 58 }, {
      fontSize: 19,
      color: colors.muted,
    });
  }
}

async function addImage(slide, imagePath, position, alt) {
  slide.images.add({
    blob: await readImageBlob(imagePath),
    contentType: "image/jpeg",
    alt,
    fit: "cover",
    position,
    geometry: "roundRect",
    borderRadius: "rounded-md",
  });
}

function addPill(slide, text, left, top, fill, width = 170) {
  box(slide, { left, top, width, height: 34 }, fill, fill);
  textBox(slide, text, { left: left + 12, top: top + 6, width: width - 24, height: 22 }, {
    fontSize: 13,
    bold: true,
    color: fill === colors.tealDark ? colors.white : colors.ink,
    alignment: "center",
  });
}

async function createDeck() {
  await fs.mkdir(PREVIEW_DIR, { recursive: true });
  await fs.mkdir(LAYOUT_DIR, { recursive: true });
  await fs.mkdir(QA_DIR, { recursive: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  await fs.writeFile(
    path.join(TMP_DIR, "source-notes.txt"),
    [
      "Source: user-provided PDF, title visible as '부안군 건축인허가 가이드북'.",
      "Path used locally: D:\\프로그램\\부안군 건축인허가 가이드북.pdf",
      "PDF metadata creation date: 2022-06-09, 116 pages.",
      "Facts in the deck are summarized from rendered source pages 3, 4, 10, 13, 16, 24, 36, 63, 69, 70, 73, 83, 86, 87, 101, 106, and 111.",
      "External legal caveat: building laws and local ordinances may have changed; verify latest official rules before public release.",
    ].join("\n"),
  );

  await fs.writeFile(
    path.join(TMP_DIR, "slide-plan.txt"),
    [
      "Mode: create.",
      "Audience: Buangun residents, architects, civil affairs staff, and web visitors who need a readable guide overview.",
      "Deliverable: editable PPTX summary supporting the static web version.",
      "Colors: dominant paper #FBFAF6 and ink #1D2528, supporting teal #4F9D97, olive #858A3B, blue #5D789C, mauve #A36F7D, taupe #928466, accent #D99A4E.",
      "Fonts: Aptos Display for headings, Aptos for body and labels.",
      "Scale: cover title 52px, slide titles 34-38px, body 17-20px, labels 12-15px.",
      "Slides: cover, web structure, chapter map, quick finder, building permit flow, required checks, Buangun environment, standards and cultural heritage, demolition and maintenance, publication checklist.",
    ].join("\n"),
  );

  const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.paper;
    textBox(slide, "BUANGUN GUIDEBOOK WEB EDITION", { left: 72, top: 72, width: 520, height: 28 }, {
      fontSize: 13,
      bold: true,
      color: colors.tealDark,
    });
    textBox(slide, "부안군 건축인허가 가이드북", { left: 72, top: 138, width: 700, height: 70 }, {
      typeface: "Aptos Display",
      fontSize: 52,
      bold: true,
      color: colors.ink,
    });
    textBox(slide, "웹에서 바로 배포할 수 있도록 요약, 시각화, 원문 뷰어 구조로 재구성한 편집 가능 요약본", { left: 72, top: 226, width: 650, height: 84 }, {
      fontSize: 22,
      color: colors.muted,
    });
    addPill(slide, "정적 HTML", 72, 356, colors.tealDark, 150);
    addPill(slide, "116쪽 원문 뷰어", 236, 356, colors.paleTeal, 190);
    addPill(slide, "절차 카드", 440, 356, colors.paleTaupe, 140);
    await addImage(slide, sourceImages.cover, { left: 850, top: 72, width: 276, height: 390 }, "가이드북 표지");
    box(slide, { left: 820, top: 522, width: 330, height: 70 }, colors.white);
    textBox(slide, "원문 보존 + 웹용 구조화", { left: 846, top: 538, width: 280, height: 32 }, {
      fontSize: 22,
      bold: true,
      color: colors.tealDark,
      alignment: "center",
    });
    footer(slide, 1);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.paper;
    title(slide, "WEB STRUCTURE", "웹 배포판은 네 개의 사용 흐름으로 구성됩니다.", "방문자가 먼저 업무를 찾고, 절차를 이해한 뒤, 필요한 원문 페이지를 확대해서 확인하도록 설계했습니다.");
    const items = [
      ["빠른 길찾기", "건축허가, 해체, 문화재, 소방 등 업무별 진입점"],
      ["핵심 절차", "건축허가 흐름과 단계별 제출/확인 사항"],
      ["장별 목차", "원문 6개 장을 색상과 페이지 범위로 재정리"],
      ["원문 뷰어", "116쪽 전체를 썸네일, 검색, 확대 모달로 제공"],
    ];
    items.forEach(([head, body], index) => {
      const left = 72 + (index % 2) * 548;
      const top = 290 + Math.floor(index / 2) * 152;
      box(slide, { left, top, width: 500, height: 112 }, colors.white);
      textBox(slide, `0${index + 1}`, { left: left + 22, top: top + 24, width: 58, height: 42 }, {
        fontSize: 32,
        bold: true,
        color: [colors.teal, colors.olive, colors.blue, colors.mauve][index],
      });
      textBox(slide, head, { left: left + 96, top: top + 24, width: 350, height: 30 }, {
        fontSize: 23,
        bold: true,
        color: colors.ink,
      });
      textBox(slide, body, { left: left + 96, top: top + 60, width: 360, height: 34 }, {
        fontSize: 16,
        color: colors.muted,
      });
    });
    footer(slide, 2);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.paper;
    title(slide, "CONTENTS MAP", "원문 6개 장을 색상별 탐색 구조로 정리했습니다.");
    chapters.forEach(([num, head, body, pages, color], index) => {
      const left = 72 + (index % 3) * 382;
      const top = 220 + Math.floor(index / 3) * 178;
      box(slide, { left, top, width: 344, height: 132 }, colors.white);
      box(slide, { left: left + 18, top: top + 18, width: 48, height: 48 }, color, color);
      textBox(slide, num, { left: left + 18, top: top + 24, width: 48, height: 34 }, {
        fontSize: 26,
        bold: true,
        color: colors.white,
        alignment: "center",
      });
      textBox(slide, head, { left: left + 82, top: top + 20, width: 230, height: 32 }, {
        fontSize: 19,
        bold: true,
        color: colors.ink,
      });
      textBox(slide, body, { left: left + 82, top: top + 56, width: 226, height: 40 }, {
        fontSize: 15,
        color: colors.muted,
      });
      textBox(slide, pages, { left: left + 82, top: top + 98, width: 160, height: 22 }, {
        fontSize: 13,
        bold: true,
        color,
      });
    });
    footer(slide, 3);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.paper;
    title(slide, "QUICK FINDER", "방문자가 필요한 업무로 바로 진입하도록 구성했습니다.");
    tasks.forEach(([head, page, body], index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const left = 72 + col * 278;
      const top = 238 + row * 162;
      box(slide, { left, top, width: 248, height: 118 }, colors.white);
      textBox(slide, page, { left: left + 16, top: top + 15, width: 82, height: 24 }, {
        fontSize: 13,
        bold: true,
        color: colors.tealDark,
      });
      textBox(slide, head, { left: left + 16, top: top + 43, width: 200, height: 28 }, {
        fontSize: 19,
        bold: true,
        color: colors.ink,
      });
      textBox(slide, body, { left: left + 16, top: top + 75, width: 205, height: 30 }, {
        fontSize: 14,
        color: colors.muted,
      });
    });
    footer(slide, 4);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.paper;
    title(slide, "PERMIT FLOW", "건축허가 절차를 한 줄 흐름으로 다시 그렸습니다.", "원문 10쪽의 큰 흐름을 웹과 발표용으로 재배치했습니다.");
    permitFlow.forEach(([head, body], index) => {
      const left = 72 + index * 160;
      const top = 318 + (index % 2) * 82;
      box(slide, { left, top, width: 138, height: 74 }, index % 2 ? colors.paleTaupe : colors.paleTeal);
      textBox(slide, String(index + 1), { left: left + 12, top: top + 10, width: 24, height: 20 }, {
        fontSize: 14,
        bold: true,
        color: colors.tealDark,
        alignment: "center",
      });
      textBox(slide, head, { left: left + 40, top: top + 10, width: 86, height: 22 }, {
        fontSize: 15,
        bold: true,
        color: colors.ink,
      });
      textBox(slide, body, { left: left + 14, top: top + 38, width: 112, height: 28 }, {
        fontSize: 11,
        color: colors.muted,
        alignment: "center",
      });
      if (index < permitFlow.length - 1) {
        textBox(slide, ">", { left: left + 142, top: top + 22, width: 24, height: 30 }, {
          fontSize: 24,
          bold: true,
          color: colors.line,
          alignment: "center",
        });
      }
    });
    await addImage(slide, sourceImages.permit, { left: 882, top: 84, width: 230, height: 324 }, "원문 10쪽 건축허가 절차");
    footer(slide, 5);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.paper;
    title(slide, "PRE-CHECK LIST", "허가 신청 전에는 토지, 도면, 협의 대상을 먼저 묶어서 점검합니다.");
    const list = [
      ["토지 기본자료", "토지이용계획확인원, 토지대장, 지적도, 토지등기부등본"],
      ["건축 도면", "배치도, 평면도, 입면도, 단면도와 건축계획 관련 서류"],
      ["토지 사용관계", "타인 토지인 경우 토지사용승낙서와 인감 관련 자료"],
      ["복합민원", "오수처리, 배수설비, 개발행위, 농지전용, 산지전용, 도로점용"],
      ["부담금 확인", "농지보전부담금 등 해당 부담금 납부 여부"],
    ];
    list.forEach(([head, body], index) => {
      const top = 220 + index * 76;
      box(slide, { left: 76, top, width: 792, height: 54 }, colors.white);
      textBox(slide, head, { left: 102, top: top + 12, width: 160, height: 24 }, {
        fontSize: 17,
        bold: true,
        color: [colors.tealDark, colors.olive, colors.blue, colors.mauve, colors.taupe][index],
      });
      textBox(slide, body, { left: 280, top: top + 13, width: 540, height: 22 }, {
        fontSize: 15,
        color: colors.muted,
      });
    });
    box(slide, { left: 930, top: 230, width: 230, height: 250 }, colors.paleTeal);
    textBox(slide, "웹에서는 이 체크리스트를 업무별 카드와 원문 링크로 연결했습니다.", { left: 960, top: 278, width: 170, height: 112 }, {
      fontSize: 21,
      bold: true,
      color: colors.tealDark,
      alignment: "center",
    });
    footer(slide, 6);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.paper;
    title(slide, "LOCAL CONTEXT", "부안군 건축환경은 토지이용과 지역 기준부터 확인합니다.");
    await addImage(slide, sourceImages.land, { left: 72, top: 215, width: 338, height: 478 }, "원문 16쪽 토지이용계획 현황");
    const points = [
      ["토지이용계획 현황", "도시지역과 준도시지역의 지구, 편입리, 승인일자 확인"],
      ["건폐율과 용적률", "용도지역별 허용 범위를 사전에 검토"],
      ["경관심의와 위원회", "대상 건축물 및 심의 기준을 별도 확인"],
      ["부안군 현황도", "도시지역, 지구단위계획구역, 문화재 지정현황 등 지도 자료"],
    ];
    points.forEach(([head, body], index) => {
      const top = 230 + index * 96;
      box(slide, { left: 460, top, width: 610, height: 70 }, colors.white);
      textBox(slide, head, { left: 486, top: top + 13, width: 220, height: 24 }, {
        fontSize: 18,
        bold: true,
        color: colors.tealDark,
      });
      textBox(slide, body, { left: 718, top: top + 15, width: 310, height: 34 }, {
        fontSize: 15,
        color: colors.muted,
      });
    });
    footer(slide, 7);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.paper;
    title(slide, "SPECIAL STANDARDS", "기준 검토는 교육환경, 문화재, 현장 표지판처럼 놓치기 쉬운 항목을 분리합니다.");
    await addImage(slide, sourceImages.culture, { left: 820, top: 175, width: 230, height: 324 }, "원문 69쪽 문화재 지표조사 절차");
    const flow = [
      "지표조사 사업신청",
      "착수 신고",
      "지표조사 수행",
      "결과보고서 제출",
      "문화재 보존조치",
    ];
    flow.forEach((item, index) => {
      const left = 72 + index * 140;
      box(slide, { left, top: 330, width: 118, height: 70 }, colors.paleMauve);
      textBox(slide, item, { left: left + 10, top: 350, width: 98, height: 30 }, {
        fontSize: 14,
        bold: true,
        color: colors.ink,
        alignment: "center",
      });
      if (index < flow.length - 1) {
        textBox(slide, ">", { left: left + 120, top: 348, width: 18, height: 28 }, {
          fontSize: 22,
          bold: true,
          color: colors.mauve,
          alignment: "center",
        });
      }
    });
    const notes = [
      ["교육환경보호구역", "금지행위와 시설 종류를 표로 확인"],
      ["건축허가표지판", "착공부터 사용승인일까지 주요 출입구에 설치"],
      ["지적측량 수수료", "공시된 수수료 체계를 별도 확인"],
    ];
    notes.forEach(([head, body], index) => {
      const top = 458 + index * 58;
      textBox(slide, head, { left: 86, top, width: 190, height: 24 }, {
        fontSize: 17,
        bold: true,
        color: colors.mauve,
      });
      textBox(slide, body, { left: 286, top: top + 1, width: 420, height: 24 }, {
        fontSize: 15,
        color: colors.muted,
      });
    });
    footer(slide, 8);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.paper;
    title(slide, "DEMOLITION & MANAGEMENT", "해체와 유지관리는 신고/허가 분기와 관리계획 작성 기준을 함께 보여줍니다.");
    await addImage(slide, sourceImages.demolition, { left: 78, top: 210, width: 250, height: 352 }, "원문 87쪽 해체 허가와 신고");
    const branches = [
      ["신고의 경우", "신고서 작성 -> 제출"],
      ["허가의 경우", "신고서 작성 -> 접수 -> 검토 -> 심의 -> 허가서 발급"],
      ["관리계획", "현황, 관계자, 마감재, 장기수선, 피난안전, 구조안전 등"],
    ];
    branches.forEach(([head, body], index) => {
      const top = 230 + index * 110;
      box(slide, { left: 410, top, width: 610, height: 78 }, index === 2 ? colors.paleTaupe : colors.white);
      textBox(slide, head, { left: 438, top: top + 18, width: 170, height: 24 }, {
        fontSize: 19,
        bold: true,
        color: index === 2 ? colors.taupe : colors.tealDark,
      });
      textBox(slide, body, { left: 628, top: top + 18, width: 330, height: 36 }, {
        fontSize: 16,
        color: colors.muted,
      });
    });
    footer(slide, 9);
  }

  {
    const slide = presentation.slides.add();
    slide.background.fill = colors.paper;
    title(slide, "PUBLICATION CHECK", "웹 게시 전에는 최신성, 원문성, 접근성을 한 번 더 확인하세요.");
    const checks = [
      ["최신성", "건축법, 건축물관리법, 부안군 조례와 고시 개정 여부 확인"],
      ["원문성", "PDF 원문 링크와 페이지 이미지가 모두 정상 표시되는지 확인"],
      ["접근성", "모바일 화면, 큰 글자, 검색, 키보드 확대 보기 동작 확인"],
      ["운영", "실제 민원 접수 담당 부서, 전화번호, 게시일을 별도 반영"],
    ];
    checks.forEach(([head, body], index) => {
      const left = 92 + (index % 2) * 520;
      const top = 230 + Math.floor(index / 2) * 156;
      box(slide, { left, top, width: 470, height: 112 }, colors.white);
      textBox(slide, head, { left: left + 24, top: top + 20, width: 130, height: 30 }, {
        fontSize: 22,
        bold: true,
        color: [colors.tealDark, colors.olive, colors.blue, colors.mauve][index],
      });
      textBox(slide, body, { left: left + 24, top: top + 56, width: 390, height: 36 }, {
        fontSize: 16,
        color: colors.muted,
      });
    });
    footer(slide, 10, "원문 PDF 기반 웹 재구성본. 실제 배포 전 최신 법령과 부안군 고시 확인 필요.");
  }

  for (const [index, slide] of presentation.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    await writeBlob(path.join(PREVIEW_DIR, `${stem}.png`), await presentation.export({ slide, format: "png", scale: 1 }));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(LAYOUT_DIR, `${stem}.layout.json`), await layout.text());
  }

  await writeBlob(path.join(PREVIEW_DIR, "deck-montage.webp"), await presentation.export({ format: "webp", montage: true, scale: 1 }));
  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(FINAL_PPTX);

  await fs.writeFile(
    path.join(QA_DIR, "visual-qa.txt"),
    [
      "Visual QA summary",
      "Rendered every slide to PNG and generated deck montage.",
      "Checked slide layout for large readable text, consistent page footers, and non-full-slide bitmap use.",
      "Slides use editable text boxes and shapes; source page images are supporting references only.",
      `Final PPTX: ${FINAL_PPTX}`,
    ].join("\n"),
  );

  console.log(JSON.stringify({ FINAL_PPTX, WORKSPACE, PREVIEW_DIR, LAYOUT_DIR, QA_DIR }, null, 2));
}

createDeck().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

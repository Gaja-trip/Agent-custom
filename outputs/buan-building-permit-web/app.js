const guide = window.BUAN_GUIDE;
const root = document.body.dataset.root || "./";
const pageCount = 116;
let activeChapter = "all";
let currentPage = 1;

const pageGrid = document.querySelector("#pageGrid");
const modal = document.querySelector("#pageModal");
const modalImage = document.querySelector("#modalImage");
const modalTitle = document.querySelector("#modalTitle");

function chapterUrl(chapter) {
  return `${root}${chapter.path}`;
}

function asset(path) {
  return `${root}${path}`;
}

function chapterForPage(page) {
  return guide.chapters.find((chapter) => page >= chapter.range[0] && page <= chapter.range[1]);
}

function pageTitle(page) {
  const chapter = chapterForPage(page);
  return guide.pageHighlights[page] || (chapter ? chapter.title : "원문 페이지");
}

function renderChapters() {
  const chapterList = document.querySelector("#chapterList");
  if (!chapterList) return;
  chapterList.innerHTML = guide.chapters
    .map(
      (chapter) => `
        <article class="chapter-card chapter-entry" style="border-top-color: ${chapter.color}">
          <span class="tag">${chapter.range[0]}-${chapter.range[1]}쪽</span>
          <h3>${chapter.number}. ${chapter.title}</h3>
          <p>${chapter.summary}</p>
          <div class="mini-list">
            ${chapter.sections
              .slice(0, 3)
              .map((section) => `<span>${section.title}</span>`)
              .join("")}
          </div>
          <a class="text-link" href="${chapterUrl(chapter)}">이 장 설명 페이지 열기</a>
        </article>
      `,
    )
    .join("");
}

function renderTasks() {
  const taskGrid = document.querySelector("#taskGrid");
  if (!taskGrid) return;
  taskGrid.innerHTML = guide.tasks
    .map((task) => {
      const chapter = guide.chapters.find((item) => item.id === task.chapter);
      return `
        <article class="task-card">
          <div>
            <span class="tag">${task.tag}</span>
            <h3>${task.title}</h3>
            <p>${task.copy}</p>
          </div>
          <div class="card-actions">
            <a href="${chapterUrl(chapter)}">장별 설명</a>
            <a href="#reader" data-open-page="${task.page}">원문 ${task.page}쪽</a>
          </div>
        </article>
      `;
    })
    .join("");
}

function normalize(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function buildSearchIndex() {
  const results = [];

  guide.chapters.forEach((chapter) => {
    results.push({
      type: "장",
      title: `${chapter.number}. ${chapter.title}`,
      body: chapter.summary,
      href: chapterUrl(chapter),
      text: normalize([
        chapter.title,
        chapter.summary,
        chapter.readWhen.join(" "),
        chapter.sections.map((section) => section.searchText || section.plain).join(" "),
      ].join(" ")),
    });

    chapter.sections.forEach((section) => {
      results.push({
        type: "상세 설명",
        title: section.title,
        body: [section.plain, ...(section.details || []), section.example].filter(Boolean).join(" "),
        href: chapterUrl(chapter),
        page: Number(String(section.pages).match(/\d+/)?.[0] || chapter.coverPage),
        text: normalize(section.searchText || [chapter.title, section.title, section.plain, section.checks.join(" ")].join(" ")),
      });
    });
  });

  guide.tasks.forEach((task) => {
    const chapter = guide.chapters.find((item) => item.id === task.chapter);
    results.push({
      type: "업무",
      title: task.title,
      body: task.copy,
      href: chapterUrl(chapter),
      page: task.page,
      text: normalize([task.title, task.tag, task.copy, chapter?.title].join(" ")),
    });
  });

  Object.entries(guide.pageHighlights).forEach(([page, title]) => {
    const chapter = chapterForPage(Number(page));
    results.push({
      type: "원문",
      title: `${page}쪽 · ${title}`,
      body: chapter ? chapter.title : "원문 PDF 페이지",
      href: chapter ? chapterUrl(chapter) : `${root}index.html#reader`,
      page,
      text: normalize([page, `${page}쪽`, title, chapter?.title].join(" ")),
    });
  });

  return results;
}

const searchIndex = buildSearchIndex();

function renderGlobalSearch() {
  const input = document.querySelector("#globalSearch");
  const target = document.querySelector("#globalSearchResults");
  if (!input || !target) return;

  const query = normalize(input.value);
  if (!query) {
    target.innerHTML = `
      <article class="empty-search">
        <strong>검색어를 입력하면 관련 목차와 원문 페이지가 표시됩니다.</strong>
        <span>추천 검색어: 해체, 농지, 경관심의, 주차장, 문화재, 사용승인, 건축물대장</span>
      </article>
    `;
    return;
  }

  const terms = query.split(" ").filter(Boolean);
  const matches = searchIndex
    .map((item) => {
      const score = terms.reduce((sum, term) => sum + (item.text.includes(term) ? 1 : 0), 0);
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, 18);

  if (!matches.length) {
    target.innerHTML = `
      <article class="empty-search">
        <strong>검색 결과가 없습니다.</strong>
        <span>다른 표현으로 검색해 보세요. 예: 해체 허가, 문화재 조사, 토지이용계획</span>
      </article>
    `;
    return;
  }

  target.innerHTML = matches
    .map(({ item }) => `
      <article class="search-result-card">
        <span class="tag">${item.type}</span>
        <h3>${item.title}</h3>
        <p>${item.body.length > 160 ? `${item.body.slice(0, 160)}...` : item.body}</p>
        <div class="card-actions">
          <a href="${item.href}">관련 설명 보기</a>
          ${item.page ? `<a href="#reader" data-open-page="${item.page}">원문 ${item.page}쪽</a>` : ""}
        </div>
      </article>
    `)
    .join("");
}

function renderFlow() {
  const flow = document.querySelector("#permitFlow");
  if (!flow) return;
  flow.innerHTML = guide.permitFlow
    .map(
      ([title, copy], index) => `
        <article class="flow-step" data-step="${index + 1}">
          <h3>${title}</h3>
          <p>${copy}</p>
        </article>
      `,
    )
    .join("");
}

function renderFilters() {
  const tools = document.querySelector("#readerTools");
  if (!tools) return;
  const buttons = [{ id: "all", title: "전체" }, ...guide.chapters].map(
    (chapter) => `
      <button class="filter-button ${chapter.id === activeChapter ? "is-active" : ""}"
        type="button"
        data-filter="${chapter.id}">
        ${chapter.title}
      </button>
    `,
  );
  tools.innerHTML = buttons.join("");
}

function visiblePages() {
  const input = document.querySelector("#pageSearch");
  const query = input ? input.value.trim().toLowerCase() : "";
  return Array.from({ length: pageCount }, (_, index) => index + 1).filter((page) => {
    const chapter = chapterForPage(page);
    const inChapter = activeChapter === "all" || (chapter && chapter.id === activeChapter);
    const haystack = `${page} ${page}쪽 ${pageTitle(page)} ${chapter ? chapter.title : ""}`.toLowerCase();
    return inChapter && (!query || haystack.includes(query));
  });
}

function renderPages() {
  if (!pageGrid) return;
  const pages = visiblePages();
  pageGrid.innerHTML = pages
    .map((page) => {
      const chapter = chapterForPage(page);
      const padded = String(page).padStart(3, "0");
      return `
        <button class="page-card" type="button" data-page="${page}">
          <img src="${asset(`assets/thumbs/page-${padded}.webp`)}" loading="lazy" alt="${page}쪽 미리보기" />
          <span class="page-meta">
            <strong>${page}쪽</strong>
            <span>${pageTitle(page)}</span>
            <span>${chapter ? chapter.title : "원문"}</span>
          </span>
        </button>
      `;
    })
    .join("");
}

function openPage(page) {
  if (!modal || !modalImage || !modalTitle) return;
  currentPage = Math.min(pageCount, Math.max(1, Number(page)));
  const padded = String(currentPage).padStart(3, "0");
  modalImage.src = asset(`assets/pages/page-${padded}.webp`);
  modalImage.alt = `${currentPage}쪽 원문 이미지`;
  modalTitle.textContent = `${currentPage}쪽 - ${pageTitle(currentPage)}`;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  if (!modal || !modalImage) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  modalImage.removeAttribute("src");
}

document.addEventListener("click", (event) => {
  const openTarget = event.target.closest("[data-open-page]");
  if (openTarget) {
    openPage(openTarget.dataset.openPage);
    return;
  }

  const pageCard = event.target.closest("[data-page]");
  if (pageCard) {
    openPage(pageCard.dataset.page);
    return;
  }

  const filter = event.target.closest("[data-filter]");
  if (filter) {
    activeChapter = filter.dataset.filter;
    renderFilters();
    renderPages();
  }
});

document.querySelector("#pageSearch")?.addEventListener("input", renderPages);
document.querySelector("#globalSearch")?.addEventListener("input", renderGlobalSearch);
document.querySelector("#modalClose")?.addEventListener("click", closeModal);
document.querySelector("#modalPrev")?.addEventListener("click", () => openPage(currentPage - 1));
document.querySelector("#modalNext")?.addEventListener("click", () => openPage(currentPage + 1));

document.addEventListener("keydown", (event) => {
  if (!modal || !modal.classList.contains("is-open")) return;
  if (event.key === "Escape") closeModal();
  if (event.key === "ArrowLeft") openPage(currentPage - 1);
  if (event.key === "ArrowRight") openPage(currentPage + 1);
});

renderChapters();
renderTasks();
renderGlobalSearch();
renderFlow();
renderFilters();
renderPages();

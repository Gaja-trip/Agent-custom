const guide = window.BUAN_GUIDE;
const root = document.body.dataset.root || "../";
const chapterId = document.body.dataset.chapter;
const chapter = guide.chapters.find((item) => item.id === chapterId);
const pageCount = 116;
let currentPage = chapter ? chapter.coverPage : 1;

const modal = document.querySelector("#pageModal");
const modalImage = document.querySelector("#modalImage");
const modalTitle = document.querySelector("#modalTitle");

function asset(path) {
  return `${root}${path}`;
}

function chapterUrl(item) {
  return `${root}${item.path}`;
}

function chapterForPage(page) {
  return guide.chapters.find((item) => page >= item.range[0] && page <= item.range[1]);
}

function pageTitle(page) {
  const owner = chapterForPage(page);
  return guide.pageHighlights[page] || (owner ? owner.title : "원문 페이지");
}

function openPage(page) {
  currentPage = Math.min(pageCount, Math.max(1, Number(page)));
  const padded = String(currentPage).padStart(3, "0");
  modalImage.src = asset(`assets/pages/page-${padded}.webp`);
  modalImage.alt = `${currentPage}쪽 원문 이미지`;
  modalTitle.textContent = `${currentPage}쪽 - ${pageTitle(currentPage)}`;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  modalImage.removeAttribute("src");
}

function renderSiblingNav() {
  const nav = document.querySelector("#chapterNav");
  nav.innerHTML = guide.chapters
    .map(
      (item) => `
        <a class="${item.id === chapter.id ? "is-current" : ""}" href="${chapterUrl(item)}">
          ${item.number}. ${item.title}
        </a>
      `,
    )
    .join("");
}

function renderChapter() {
  if (!chapter) {
    document.querySelector("main").innerHTML = "<section class=\"section\"><h1>장 정보를 찾을 수 없습니다.</h1></section>";
    return;
  }

  document.title = `${chapter.number}. ${chapter.title} | 부안군 건축인허가 가이드북`;
  document.documentElement.style.setProperty("--chapter-color", chapter.color);
  document.querySelector("#chapterNumber").textContent = `Chapter ${chapter.number}`;
  document.querySelector("#chapterTitle").textContent = chapter.title;
  document.querySelector("#chapterRange").textContent = `${chapter.range[0]}-${chapter.range[1]}쪽`;
  document.querySelector("#chapterSummary").textContent = chapter.summary;
  document.querySelector("#chapterCover").src = asset(`assets/pages/page-${String(chapter.coverPage).padStart(3, "0")}.webp`);
  document.querySelector("#chapterCover").alt = `${chapter.title} 표지`;

  document.querySelector("#readWhen").innerHTML = chapter.readWhen
    .map((item) => `<li>${item}</li>`)
    .join("");

  document.querySelector("#sectionList").innerHTML = chapter.sections
    .map(
      (section, index) => `
        <article class="explain-card">
          <span class="tag">${section.pages}</span>
          <h3>${index + 1}. ${section.title}</h3>
          <p>${section.plain}</p>
          ${
            section.details
              ? `<ul class="detail-list">${section.details.map((detail) => `<li>${detail}</li>`).join("")}</ul>`
              : ""
          }
          ${section.example ? `<p class="example-note"><strong>예시</strong> ${section.example}</p>` : ""}
          <div class="check-list">
            ${section.checks.map((check) => `<span>${check}</span>`).join("")}
          </div>
        </article>
      `,
    )
    .join("");

  document.querySelector("#chapterFlow").innerHTML = chapter.flow
    .map(
      (step, index) => `
        <article class="flow-step" data-step="${index + 1}">
          <h3>${step}</h3>
        </article>
      `,
    )
    .join("");

  document.querySelector("#sourcePages").innerHTML = chapter.pages
    .map((page) => {
      const padded = String(page).padStart(3, "0");
      return `
        <button class="source-page-card" type="button" data-open-page="${page}">
          <img src="${asset(`assets/thumbs/page-${padded}.webp`)}" loading="lazy" alt="${page}쪽 원문 썸네일" />
          <span>
            <strong>${page}쪽</strong>
            <small>${pageTitle(page)}</small>
          </span>
        </button>
      `;
    })
    .join("");

  const currentIndex = guide.chapters.findIndex((item) => item.id === chapter.id);
  const prev = guide.chapters[currentIndex - 1];
  const next = guide.chapters[currentIndex + 1];
  document.querySelector("#pager").innerHTML = `
    ${prev ? `<a class="button" href="${chapterUrl(prev)}">이전 장: ${prev.title}</a>` : `<a class="button" href="${root}index.html#chapters">목차로 돌아가기</a>`}
    ${next ? `<a class="button primary" href="${chapterUrl(next)}">다음 장: ${next.title}</a>` : `<a class="button primary" href="${root}index.html#reader">원문 전체 보기</a>`}
  `;

  renderSiblingNav();
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-open-page]");
  if (target) openPage(target.dataset.openPage);
});

document.querySelector("#modalClose")?.addEventListener("click", closeModal);
document.querySelector("#modalPrev")?.addEventListener("click", () => openPage(currentPage - 1));
document.querySelector("#modalNext")?.addEventListener("click", () => openPage(currentPage + 1));

document.addEventListener("keydown", (event) => {
  if (!modal.classList.contains("is-open")) return;
  if (event.key === "Escape") closeModal();
  if (event.key === "ArrowLeft") openPage(currentPage - 1);
  if (event.key === "ArrowRight") openPage(currentPage + 1);
});

renderChapter();

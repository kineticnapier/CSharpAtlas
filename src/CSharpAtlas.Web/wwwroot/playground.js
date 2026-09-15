const defaultCode = `using System;\n\nConsole.WriteLine("Hello, C# Atlas!");\n`;

const codeInput = document.getElementById('codeInput');
const compileButton = document.getElementById('compileButton');
const resetButton = document.getElementById('resetButton');
const diagnostics = document.getElementById('diagnostics');
const compileStatus = document.getElementById('compileStatus');
const playgroundSection = document.getElementById('playgroundSection');
const playgroundFab = document.getElementById('playgroundFab');
const playgroundNavButton = document.getElementById('playgroundNavButton');

if (codeInput && compileButton && resetButton && diagnostics && compileStatus) {
  if (!codeInput.value) codeInput.value = defaultCode;

  resetButton.addEventListener('click', () => {
    codeInput.value = defaultCode;
    resetDiagnostics();
    codeInput.focus();
  });

  compileButton.addEventListener('click', compileCode);

  codeInput.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      compileCode();
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      const start = codeInput.selectionStart;
      const end = codeInput.selectionEnd;
      codeInput.setRangeText('    ', start, end, 'end');
    }
  });
}

playgroundFab?.addEventListener('click', () => scrollToPlayground(true));
playgroundNavButton?.addEventListener('click', () => scrollToPlayground(false));

window.openPlaygroundCode = code => {
  if (!codeInput) return;
  codeInput.value = code;
  resetDiagnostics();
  scrollToPlayground(true);
};

function scrollToPlayground(focusEditor) {
  const target = playgroundSection ?? codeInput;
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (focusEditor && codeInput) {
    setTimeout(() => codeInput.focus(), 350);
  }
}

function resetDiagnostics() {
  if (!diagnostics || !compileStatus) return;
  diagnostics.className = 'diagnostics-empty';
  diagnostics.textContent = '「コンパイル」を押すと結果が表示されます。';
  compileStatus.className = 'compile-status';
  compileStatus.textContent = '未実行';
}

async function compileCode() {
  if (!codeInput || !compileButton || !diagnostics || !compileStatus) return;

  compileButton.disabled = true;
  compileButton.textContent = '確認中...';
  compileStatus.className = 'compile-status';
  compileStatus.textContent = '確認中';

  try {
    const response = await fetch('/api/playground/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: codeInput.value })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'コンパイルに失敗しました。');
    }

    renderDiagnostics(data);
  } catch (error) {
    compileStatus.className = 'compile-status failed';
    compileStatus.textContent = '失敗';
    diagnostics.className = 'diagnostics-empty error-text';
    diagnostics.textContent = error.message;
  } finally {
    compileButton.disabled = false;
    compileButton.textContent = 'コンパイル';
  }
}

function renderDiagnostics(result) {
  if (result.success && result.diagnostics.length === 0) {
    compileStatus.className = 'compile-status success';
    compileStatus.textContent = 'エラーなし';
    diagnostics.className = 'diagnostics-empty success-text';
    diagnostics.textContent = 'コンパイルエラー・警告はありません。';
    return;
  }

  const errorCount = result.diagnostics.filter(x => x.severity === 'error').length;
  const warningCount = result.diagnostics.filter(x => x.severity === 'warning').length;

  compileStatus.className = `compile-status ${errorCount ? 'failed' : 'warning'}`;
  compileStatus.textContent = errorCount
    ? `エラー ${errorCount}件`
    : `警告 ${warningCount}件`;

  diagnostics.className = 'diagnostics-list';
  diagnostics.innerHTML = result.diagnostics.map(item => {
    const location = item.line == null
      ? ''
      : `<span class="diagnostic-location">${item.line}:${item.column}</span>`;

    return `
      <button class="diagnostic-item ${escapeHtml(item.severity)}" data-line="${item.line ?? ''}" data-column="${item.column ?? ''}">
        <div class="diagnostic-top">
          <strong>${escapeHtml(item.id)}</strong>
          ${location}
        </div>
        <div>${escapeHtml(item.message)}</div>
      </button>
    `;
  }).join('');

  diagnostics.querySelectorAll('.diagnostic-item[data-line]').forEach(item => {
    item.addEventListener('click', () => {
      const line = Number(item.dataset.line);
      const column = Number(item.dataset.column);
      if (!line || !column) return;
      moveCursorTo(line, column);
    });
  });
}

function moveCursorTo(line, column) {
  const lines = codeInput.value.split('\n');
  let index = 0;

  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    index += lines[i].length + 1;
  }

  index += Math.max(0, column - 1);
  codeInput.focus();
  codeInput.setSelectionRange(index, index);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function entityTooLargeMessage() {
  return "이미지 용량이 너무 큽니다. 더 작은 이미지를 사용하거나, 다른 브라우저에서 선택한 파일과 동일한지 확인해 주세요.";
}

export async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error(`서버 응답이 비어 있습니다. (${response.status})`);
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return JSON.parse(trimmed) as T;
  }

  if (response.status === 413 || /request entity too large/i.test(trimmed)) {
    throw new Error(entityTooLargeMessage());
  }

  const preview = trimmed.length > 160 ? `${trimmed.slice(0, 160)}…` : trimmed;
  throw new Error(preview || `서버 오류 (${response.status})`);
}

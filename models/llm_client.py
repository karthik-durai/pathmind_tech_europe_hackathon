"""Thin Nebius Token Factory client (OpenAI-compatible). Every LLM/VLM call goes through here."""
import base64
import io
import os
import re
import time

from PIL import Image

DEFAULT_BASE_URL = "https://api.tokenfactory.nebius.com/v1/"
DEFAULT_LLM_MODEL = "Qwen/Qwen3-235B-A22B-Instruct-2507"
DEFAULT_FAST_MODEL = "Qwen/Qwen3-30B-A3B-Instruct-2507"
DEFAULT_VLM_MODEL = "nvidia/Nemotron-3.5-Super-VL"
MIN_IMAGE_SIDE = 224

_THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL)


def _is_retryable(exc):
    status = getattr(exc, "status_code", None)
    if status is not None:
        return status == 429 or status >= 500
    return exc.__class__.__name__ in ("APIConnectionError", "APITimeoutError")


def image_to_data_url(image, min_side=MIN_IMAGE_SIDE):
    """PNG data URL; images whose short side is below `min_side` are upscaled so the VLM can read them."""
    img = image.convert("RGB")
    w, h = img.size
    short = min(w, h)
    if short < min_side:
        scale = min_side / short
        img = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


class LLMClient:
    def __init__(self, api_key=None, base_url=None, llm_model=None, fast_model=None,
                 vlm_model=None, client=None, max_retries=4, sleep=time.sleep):
        self.llm_model = llm_model or os.environ.get("LLM_MODEL", DEFAULT_LLM_MODEL)
        self.fast_model = fast_model or os.environ.get("LLM_FAST_MODEL", DEFAULT_FAST_MODEL)
        self.vlm_model = vlm_model or os.environ.get("VLM_MODEL", DEFAULT_VLM_MODEL)
        self.max_retries = max_retries
        self._sleep = sleep
        if client is None:
            api_key = api_key or os.environ.get("NEBIUS_API_KEY")
            if not api_key:
                raise RuntimeError("NEBIUS_API_KEY is not set. Export your Token Factory API key first.")
            from openai import OpenAI
            client = OpenAI(
                api_key=api_key,
                base_url=base_url or os.environ.get("NEBIUS_BASE_URL", DEFAULT_BASE_URL),
            )
        self._client = client

    def _complete(self, model, messages, max_tokens, temperature, extra_body=None):
        resp = None
        kwargs = {"extra_body": extra_body} if extra_body else {}
        for attempt in range(self.max_retries + 1):
            try:
                resp = self._client.chat.completions.create(
                    model=model, messages=messages, max_tokens=max_tokens, temperature=temperature, **kwargs
                )
                break
            except Exception as exc:
                if attempt >= self.max_retries or not _is_retryable(exc):
                    raise RuntimeError(f"Token Factory call failed for model {model}: {exc}") from exc
                self._sleep(min(2 ** attempt, 20))
        text = resp.choices[0].message.content or ""
        return _THINK_RE.sub("", text).strip()

    def chat(self, messages, model=None, max_tokens=512, temperature=0.0):
        return self._complete(model or self.llm_model, messages, max_tokens, temperature)

    def chat_fast(self, messages, max_tokens=512, temperature=0.0):
        return self._complete(self.fast_model, messages, max_tokens, temperature)

    def vision(self, image, prompt, system=None, max_tokens=1024):
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": image_to_data_url(image)}},
                {"type": "text", "text": prompt},
            ],
        })
        # Nemotron VL is a reasoning model: hidden reasoning tokens eat max_tokens and leave empty content.
        extra = None if os.environ.get("VLM_THINKING") == "1" else {"chat_template_kwargs": {"enable_thinking": False}}
        return self._complete(self.vlm_model, messages, max_tokens, 0.0, extra_body=extra)

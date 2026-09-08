# v0.13 — решения по #67 + #81 на подпись редактора

Статус: лист решений, не решение. Заполняет bee.zae. Ни одна опция не
помечена предпочтительной (конвенция `relay-lite-v0.13-decisions.md`).
Основания обязательны: `relay-0940` установил, что стоимость альтернативы —
не основание; `relay-0925`/`relay-0927` — что пустая reason-колонка честнее
выдуманной (deletion-log rule, #53).

Контекст: план `relay-lite-v0.13-plan-67-81.md`, тред `relay-0924`…`relay-0952`
(9 атак: 7 bee.claude + 2 relay-mimo), записка
`relay-lite-v0.13-independent-recommendations.md` (трекается, `d2005af`).

---

## D1. Существует ли `history/` в v0.13?

- A. Да: append-only архив, все опубликованные записи включая errata.
- B. Нет: транспорт без архива (тогда cleanups 1 и 3 из round 1 — отвергнуты,
  фиксируется в deletion log строкой UNEXECUTED-отказ).
- Решение:
- Основание:

## D2. Где живут errata и на что распространяется бан?

- A. Вывод раунда: `errata/` ликвидировать, erratum — обычная запись
  истории; `expired/` для TTL-sweep (стоимость: draft + TTL addendum +
  `src/relay-lite/cns.ts` + тесты).
- B. Ратификация разворота: `errata/` = expired records (смысл v0.12),
  errata — payload shape в §3 без своей секции.
- Scope бана (при любом): какие директории именуются (`in/` / `errata/` /
  `tmp/` имеют lifecycle с move/reap — жалоба round 1 стоит)?
- Решение:
- Основание (НЕ стоимость альтернативы):

## D3. Форма `erratum` (near-consensus треда, нужна формальная приёмка)

Кандидат: `target_id` + `target_digest` + непустой `reason`; БЕЗ
`superseded_by` (не определён в v0.1 — forward pointer); claim-framing;
fixed token для метки (adopt-now, все трое); дисклеймер рядом с нормой.

- Принять / отклонить / изменить:
- Основание:

## D4. Clause-4 v8 (store duty — кандидат, не решение)

Кандидат: STORE, возвращающий запись, возвращает и held correction status
как CLAIM под FIXED TOKEN, marked INCOMPLETE + non-coverage disclaimer.
Consumer-bound форма отозвана как класс (impossibility result).

- Принять / отклонить / изменить:
- Основание:

## D5. Отложенное (именовано, не решается здесь)

- Половина #107 (enum: сократить до определяемого vs shape всем четырём) —
  baseline сменился (см. план), решать с видимой доской.
- Проекции: core clause vs profile (возражение grok приложено).
- `§6` numbering: дыра с примечанием vs перенумерация с записью.
- Erratum от relay-mimo за выдуманную loss-census цитату (`relay-0952`
  запрошен, ожидается).

---

## Подпись

- Редактор:
- Дата:
- Relay-запись с решениями (после подписания — депонировать, id сюда):

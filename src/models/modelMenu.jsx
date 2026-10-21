import { THINKING_LEVELS } from "../shared/constants.js";
import { pickSmartModel, rankModels } from "./providers.js";
import * as Icons from "../shared/icons.jsx";

const PREVIEW_COUNT = 4;

const THINKING_SHORT = { off: "Off", low: "Low", medium: "Med", high: "High" };

export default function ModelMenu({
  provider,
  active,
  models,
  isNano,
  expanded,
  thinkingValue,
  onToggleExpanded,
  onSelectAuto,
  onSelectModel,
  onSelectThinking,
}) {
  const ranked = rankModels(models);
  const visible = expanded ? ranked.slice(0, 30) : ranked.slice(0, PREVIEW_COUNT);
  const smartModel = models.length ? pickSmartModel(models) : "";

  return (
    <div aria-label="Model and effort" className="menu menu-up model-menu model-effort-card" role="menu">
      <div className="model-segment">
        <button
          className={`menu-provider ${!active?.explicit ? "active" : ""}`}
          onClick={onSelectAuto}
          role="menuitem"
          type="button"
        >
          <span className="p-name">
            <Icons.Sparkle size={14} /> Auto
          </span>
          <span className="p-model">smart pick{smartModel ? `: ${smartModel}` : ""}</span>
          {!active?.explicit && (
            <span className="p-check">
              <Icons.Check size={15} />
            </span>
          )}
        </button>

        <div className="menu-section">{provider?.name || "Model"}</div>
        {ranked.length === 0 ? (
          <div className="menu-empty">
            {isNano ? "Built-in model unavailable." : "No models yet — open Settings and press Refresh."}
          </div>
        ) : (
          <>
            <div className="model-list-scroll">
              <div className="menu-models">
                {visible.map((entry) => {
                  const selected = active?.model === entry.name;
                  return (
                    <button
                      className={`menu-item ${selected ? "active" : ""}`}
                      key={entry.name}
                      onClick={() => onSelectModel(entry.name)}
                      role="menuitem"
                      type="button"
                    >
                      <span>{entry.name}</span>
                      {selected && (
                        <span className="tick">
                          <Icons.Check size={15} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            {ranked.length > PREVIEW_COUNT && (
              <button className="menu-more" onClick={onToggleExpanded} role="menuitem" type="button">
                {expanded ? "Show less" : `+${ranked.length - PREVIEW_COUNT} more`}
              </button>
            )}
          </>
        )}
      </div>

      <div className="effort-segment">
        <div className="menu-section">Effort</div>
        <div className="effort-row">
          {THINKING_LEVELS.map((level) => (
            <button
              className={`effort-btn ${thinkingValue === level.id ? "active" : ""}`}
              key={level.id}
              onClick={() => onSelectThinking(level.id)}
              title={level.label}
              type="button"
            >
              {THINKING_SHORT[level.id] || level.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

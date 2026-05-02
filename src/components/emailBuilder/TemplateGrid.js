import { motion } from "framer-motion";
import TemplateCard from "./TemplateCard";
import { buttonMotion, templateListMotion } from "./motion";
import { stripAttachmentNotes } from "./previewUtils";

const CompareButton = ({ isActive, onClick }) => (
  <motion.button
    type="button"
    {...buttonMotion}
    onClick={onClick}
    aria-label={isActive ? "Remove from comparison" : "Add to comparison"}
    className={`rounded-full px-3 py-1.5 text-sm ${isActive ? "border border-sky-300 bg-sky-100 text-sky-800" : "border border-slate-200 bg-white text-slate-600"}`}
  >
    {"\u21C4"}
  </motion.button>
);

const FavoriteButton = ({ isActive, onClick }) => (
  <motion.button
    type="button"
    {...buttonMotion}
    onClick={onClick}
    aria-label={isActive ? "Remove favorite" : "Add favorite"}
    className={`rounded-full px-3 py-1.5 text-sm ${isActive ? "border border-rose-300 bg-rose-100 text-rose-700" : "border border-slate-200 bg-white text-slate-500"}`}
  >
    {"\u2665"}
  </motion.button>
);

const ManageButton = ({ label, tone = "slate", onClick }) => (
  <motion.button
    type="button"
    {...buttonMotion}
    onClick={onClick}
    aria-label={label}
    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
      tone === "danger"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-slate-200 bg-white text-slate-600"
    }`}
  >
    {label}
  </motion.button>
);

const TemplateGrid = ({
  templates,
  badgePrefix,
  selectedTemplate,
  favoriteTemplateIds,
  compareTemplateIds,
  onApply,
  onCopy,
  onToggleFavorite,
  onToggleCompare,
  onRename,
  onDelete,
  onArchive,
  showFavorite = false,
  showManageActions = false,
}) => {
  return (
    <motion.div
      variants={templateListMotion}
      initial="hidden"
      animate="show"
      className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-2"
    >
      {templates.map((template, index) => (
        <div key={template.id || `${template.subject}-${index}`} className="min-w-0 space-y-3">
          <TemplateCard
            template={template}
            index={index}
            badgeLabel={`${badgePrefix} ${index + 1}`}
            isSelected={selectedTemplate?.id === template.id}
            onApply={onApply}
            onCopy={onCopy}
            stripAttachmentNotes={stripAttachmentNotes}
            quickActions={
              <>
                {showFavorite && (
                  <FavoriteButton
                    isActive={favoriteTemplateIds.includes(template.id)}
                    onClick={() => onToggleFavorite(template.id)}
                  />
                )}
                <CompareButton
                  isActive={compareTemplateIds.includes(template.id)}
                  onClick={() => onToggleCompare(template)}
                />
                {showManageActions && (
                  <>
                    <ManageButton label="Rename" onClick={() => onRename(template)} />
                    <ManageButton label={template.isArchived ? "Restore" : "Archive"} onClick={() => onArchive(template)} />
                    <ManageButton label="Delete" tone="danger" onClick={() => onDelete(template)} />
                  </>
                )}
              </>
            }
          />
        </div>
      ))}
    </motion.div>
  );
};


export default TemplateGrid;

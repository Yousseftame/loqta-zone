/**
 * RightSectionList.tsx — Admin panel page
 *
 * Manages the Right Section slideshow images.
 * Full feature parity with HeroSlidesList:
 *  - Mobile-responsive layout
 *  - Touch + mouse drag-and-drop reorder
 *  - Upload zone with preview
 *  - Active/hidden toggle
 *  - Delete confirmation dialog
 */

import { useState, useRef, useCallback } from "react";
import {
  Box,
  Button,
  Paper,
  Chip,
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import {
  Upload,
  Trash2,
  AlertTriangle,
  GripVertical,
  RefreshCw,
  Eye,
  EyeOff,
  ImageIcon,
  Plus,
  PanelRight,
} from "lucide-react";
import { useRightSectionSlides } from "@/store/AdminContext/RightSectionContext/RightSectionContext";
import type { RightSectionSlide } from "@/service/rightSection/rightSectionService";

// ─── Shared colour tokens ─────────────────────────────────────────────────────
const colors = {
  primary: "#2A4863",
  primaryBg: "#EFF6FF",
  primaryRing: "#DBEAFE",
  primaryDark: "#1E40AF",
  border: "#E2E8F0",
  muted: "#F8FAFC",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  success: "#22C55E",
  successBg: "#DCFCE7",
  error: "#EF4444",
  errorBg: "#FEE2E2",
};

// ─── Touch + Mouse drag-reorder hook ─────────────────────────────────────────
function useDragReorder(
  items: RightSectionSlide[],
  onReorder: (orderedIds: string[]) => Promise<void>,
) {
  const draggingId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const handleDragStart = (id: string, idx: number) => {
    draggingId.current = id;
    setDraggingIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggingId.current !== id) setDragOverId(id);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    const sourceId = draggingId.current;
    if (!sourceId || sourceId === targetId) return;
    await _commitReorder(sourceId, targetId);
  };

  const handleDragEnd = () => {
    draggingId.current = null;
    setDragOverId(null);
    setDraggingIdx(null);
  };

  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const touchSourceId = useRef<string | null>(null);
  const touchClone = useRef<HTMLElement | null>(null);
  const itemEls = useRef<Map<string, HTMLElement>>(new Map());

  const registerItemEl = (id: string, el: HTMLElement | null) => {
    if (el) itemEls.current.set(id, el);
    else itemEls.current.delete(id);
  };

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchSourceId.current = id;

    const el = itemEls.current.get(id);
    if (el) {
      const rect = el.getBoundingClientRect();
      const clone = el.cloneNode(true) as HTMLElement;
      clone.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        opacity: 0.85;
        pointer-events: none;
        z-index: 9999;
        transform: scale(1.02);
        box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        border-radius: 8px;
        transition: none;
      `;
      document.body.appendChild(clone);
      touchClone.current = clone;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchSourceId.current || !touchClone.current) return;
    e.preventDefault();

    const touch = e.touches[0];

    if (touchClone.current && touchStartPos.current) {
      const el = itemEls.current.get(touchSourceId.current!);
      if (el) {
        const rect = el.getBoundingClientRect();
        touchClone.current.style.left = `${rect.left + (touch.clientX - touchStartPos.current.x)}px`;
        touchClone.current.style.top = `${rect.top + (touch.clientY - touchStartPos.current.y)}px`;
      }
    }

    touchClone.current.style.display = "none";
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    touchClone.current.style.display = "";

    let hoveredId: string | null = null;
    itemEls.current.forEach((el, id) => {
      if (el.contains(target as Node) && id !== touchSourceId.current) {
        hoveredId = id;
      }
    });
    setDragOverId(hoveredId);
  };

  const handleTouchEnd = async () => {
    if (touchClone.current) {
      document.body.removeChild(touchClone.current);
      touchClone.current = null;
    }

    const sourceId = touchSourceId.current;
    const targetId = dragOverId;

    setDragOverId(null);
    touchSourceId.current = null;
    touchStartPos.current = null;

    if (sourceId && targetId && sourceId !== targetId) {
      await _commitReorder(sourceId, targetId);
    }
  };

  const _commitReorder = async (sourceId: string, targetId: string) => {
    const ids = items.map((s) => s.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const newIds = [...ids];
    newIds.splice(from, 1);
    newIds.splice(to, 0, sourceId);
    await onReorder(newIds);
  };

  return {
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    registerItemEl,
    dragOverId,
    draggingIdx,
  };
}

// ─── Upload zone ──────────────────────────────────────────────────────────────
function UploadZone({ onUpload }: { onUpload: (file: File) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => {
      if (f.type.startsWith("image/")) onUpload(f);
    });
  };

  return (
    <Box
      onClick={() => fileRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      sx={{
        border: `2px dashed ${dragOver ? colors.primary : colors.border}`,
        borderRadius: 3,
        p: { xs: 3, sm: 4 },
        textAlign: "center",
        cursor: "pointer",
        bgcolor: dragOver ? colors.primaryBg : "#fff",
        transition: "all 0.2s",
        "&:hover": { borderColor: colors.primary, bgcolor: colors.primaryBg },
      }}
    >
      <Upload
        size={28}
        style={{
          color: colors.textMuted,
          margin: "0 auto 10px",
          display: "block",
        }}
      />
      <p
        style={{
          margin: 0,
          fontWeight: 600,
          color: colors.textSecondary,
          fontSize: "0.9rem",
        }}
      >
        Click or drag & drop images here
      </p>
      <p
        style={{
          margin: "4px 0 0",
          fontSize: "0.78rem",
          color: colors.textMuted,
        }}
      >
        PNG, JPG, WEBP — multiple files supported
      </p>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*"
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </Box>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RightSectionList() {
  const {
    slides,
    loading,
    refreshSlides,
    addSlide,
    toggleActive,
    reorder,
    removeSlide,
  } = useRightSectionSlides();

  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<RightSectionSlide | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const drag = useDragReorder(slides, reorder);

  const handleFileQueued = useCallback((file: File) => {
    setPendingFiles((prev) => [...prev, file]);
    setPendingPreviews((prev) => [...prev, URL.createObjectURL(file)]);
  }, []);

  const removePending = (i: number) => {
    URL.revokeObjectURL(pendingPreviews[i]);
    setPendingFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPendingPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleUploadAll = async () => {
    if (!pendingFiles.length) return;
    setUploading(true);
    for (const file of pendingFiles) {
      try {
        await addSlide({ imageFile: file, isActive: true });
      } catch {}
    }
    pendingPreviews.forEach((url) => URL.revokeObjectURL(url));
    setPendingFiles([]);
    setPendingPreviews([]);
    setUploading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeSlide(deleteTarget);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const activeCount = slides.filter((s) => s.isActive).length;

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress sx={{ color: colors.primary }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        mx: "auto",
        p: { xs: 1.5, sm: 2, md: 3 },
        bgcolor: "#F8FAFC",
        minHeight: "100vh",
      }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <div>
          <h1
            style={{
              color: colors.primary,
              margin: 0,
              fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <PanelRight
              size={24}
              style={{ display: "inline", verticalAlign: "middle" }}
            />
            Right Section Slides
          </h1>
          <p
            style={{
              color: colors.textSecondary,
              margin: "4px 0 0",
              fontSize: "0.8rem",
            }}
          >
            Manage homepage right panel slideshow
          </p>
        </div>
        <IconButton
          onClick={refreshSlides}
          sx={{
            color: colors.primary,
            border: `1px solid ${colors.border}`,
            borderRadius: 2,
            flexShrink: 0,
          }}
          title="Refresh"
        >
          <RefreshCw size={18} />
        </IconButton>
      </Box>

      {/* ── Stat cards ── */}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
          mb: 3,
        }}
      >
        {[
          {
            label: "Total",
            value: slides.length,
            icon: <ImageIcon size={20} />,
          },
          { label: "Active", value: activeCount, icon: <Eye size={20} /> },
        ].map(({ label, value, icon }) => (
          <Paper
            key={label}
            elevation={0}
            sx={{
              p: { xs: 2, md: 3 },
              borderRadius: 3,
              background: `linear-gradient(135deg, ${colors.primary} 0%, #3D6A8A 100%)`,
              color: "#fff",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    opacity: 0.8,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    margin: 0,
                  }}
                >
                  {label}
                </p>
                <p
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: 700,
                    margin: "2px 0 0",
                  }}
                >
                  {value}
                </p>
              </div>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {icon}
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* ── Upload zone ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
          mb: 3,
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderBottom: `1px solid ${colors.border}`,
            bgcolor: colors.primaryBg,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Plus size={16} style={{ color: colors.primary }} />
          <span
            style={{
              fontWeight: 700,
              color: colors.primary,
              fontSize: "0.9rem",
            }}
          >
            Add New Slides
          </span>
        </Box>
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <UploadZone onUpload={handleFileQueued} />
          {pendingPreviews.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <p
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: colors.textSecondary,
                  marginBottom: 10,
                }}
              >
                Ready to upload ({pendingPreviews.length}):
              </p>
              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
                {pendingPreviews.map((url, i) => (
                  <Box
                    key={url}
                    sx={{ position: "relative", width: 80, height: 54 }}
                  >
                    <Box
                      component="img"
                      src={url}
                      sx={{
                        width: 80,
                        height: 54,
                        borderRadius: 2,
                        objectFit: "cover",
                        border: `2px dashed ${colors.primary}`,
                      }}
                    />
                    <button
                      onClick={() => removePending(i)}
                      style={{
                        position: "absolute",
                        top: -6,
                        right: -6,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: colors.error,
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        padding: 0,
                      }}
                    >
                      <span style={{ fontSize: 12, lineHeight: 1 }}>×</span>
                    </button>
                  </Box>
                ))}
              </Box>
              <Button
                onClick={handleUploadAll}
                disabled={uploading}
                variant="contained"
                size="small"
                startIcon={
                  uploading ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <Upload size={14} />
                  )
                }
                sx={{
                  bgcolor: colors.primary,
                  textTransform: "none",
                  fontWeight: 600,
                  borderRadius: 2,
                  "&:hover": { bgcolor: "#111" },
                }}
              >
                {uploading
                  ? "Uploading…"
                  : `Upload ${pendingPreviews.length} slide${pendingPreviews.length > 1 ? "s" : ""}`}
              </Button>
            </Box>
          )}
        </Box>
      </Paper>

      {/* ── Slides list ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderBottom: `1px solid ${colors.border}`,
            bgcolor: colors.primaryBg,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <PanelRight size={16} style={{ color: colors.primary }} />
          <span
            style={{
              fontWeight: 700,
              color: colors.primary,
              fontSize: "0.9rem",
            }}
          >
            Slides ({slides.length})
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "0.72rem",
              color: colors.textMuted,
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <GripVertical size={12} style={{ display: "inline" }} /> Hold to
            reorder
          </span>
        </Box>

        {slides.length === 0 ? (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <ImageIcon
              size={40}
              style={{
                color: colors.textMuted,
                margin: "0 auto 10px",
                display: "block",
              }}
            />
            <p
              style={{
                color: colors.textSecondary,
                fontWeight: 600,
                margin: 0,
              }}
            >
              No slides yet
            </p>
            <p
              style={{
                color: colors.textMuted,
                fontSize: "0.82rem",
                margin: "4px 0 0",
              }}
            >
              Upload your first right section image above
            </p>
          </Box>
        ) : (
          <Box
            sx={{
              p: { xs: 1.5, sm: 2 },
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
            }}
          >
            {slides.map((slide, index) => (
              <Box
                key={slide.id}
                ref={(el) =>
                  drag.registerItemEl(slide.id, el as HTMLElement | null)
                }
                draggable
                onDragStart={() => drag.handleDragStart(slide.id, index)}
                onDragOver={(e) => drag.handleDragOver(e, slide.id)}
                onDrop={(e) => drag.handleDrop(e, slide.id)}
                onDragEnd={drag.handleDragEnd}
                onTouchStart={(e) => drag.handleTouchStart(e, slide.id)}
                onTouchMove={drag.handleTouchMove}
                onTouchEnd={drag.handleTouchEnd}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: { xs: 1, sm: 2 },
                  p: { xs: 1, sm: 1.5 },
                  borderRadius: 2,
                  border: `1px solid ${drag.dragOverId === slide.id ? colors.primary : colors.border}`,
                  bgcolor:
                    drag.dragOverId === slide.id ? colors.primaryBg : "#fff",
                  transition: "all 0.15s",
                  cursor: "grab",
                  userSelect: "none",
                  touchAction: "none",
                  "&:active": { cursor: "grabbing" },
                }}
              >
                <GripVertical
                  size={18}
                  style={{
                    color: colors.textMuted,
                    flexShrink: 0,
                    minWidth: 18,
                  }}
                />

                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    bgcolor: colors.primaryBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: colors.primary,
                    }}
                  >
                    {index + 1}
                  </span>
                </Box>

                <Box
                  component="img"
                  src={slide.imageUrl}
                  alt={`right-slide-${index + 1}`}
                  sx={{
                    width: { xs: 64, sm: 110, md: 140 },
                    height: { xs: 42, sm: 64, md: 80 },
                    borderRadius: 1.5,
                    objectFit: "cover",
                    border: `1px solid ${colors.border}`,
                    flexShrink: 0,
                  }}
                />

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 600,
                      fontSize: "0.82rem",
                      color: colors.textPrimary,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    Slide {index + 1}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "0.7rem",
                      color: colors.textMuted,
                    }}
                  >
                    Added {slide.createdAt.toLocaleDateString()}
                  </p>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: { xs: 0, sm: 1 },
                    flexShrink: 0,
                  }}
                >
                  <Chip
                    icon={
                      slide.isActive ? <Eye size={11} /> : <EyeOff size={11} />
                    }
                    label={slide.isActive ? "Visible" : "Hidden"}
                    size="small"
                    sx={{
                      bgcolor: slide.isActive ? colors.successBg : "#F1F5F9",
                      color: slide.isActive ? colors.success : colors.textMuted,
                      fontWeight: 700,
                      fontSize: "0.65rem",
                      display: { xs: "none", sm: "flex" },
                      height: 22,
                    }}
                  />
                  <Switch
                    checked={slide.isActive}
                    onChange={(e) => toggleActive(slide.id, e.target.checked)}
                    size="small"
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: colors.primary,
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                        { bgcolor: colors.primary },
                    }}
                  />
                </Box>

                <IconButton
                  size="small"
                  onClick={() => setDeleteTarget(slide)}
                  sx={{
                    color: colors.error,
                    "&:hover": { bgcolor: colors.errorBg },
                    borderRadius: 1.5,
                    flexShrink: 0,
                    p: { xs: 0.5, sm: 1 },
                  }}
                  title="Delete slide"
                >
                  <Trash2 size={15} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* ── Delete dialog ── */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, mx: 2 } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            color: colors.error,
            fontSize: "1rem",
          }}
        >
          <AlertTriangle size={20} /> Confirm Deletion
        </DialogTitle>
        <DialogContent>
          {deleteTarget && (
            <Box
              sx={{
                display: "flex",
                gap: 2,
                alignItems: "flex-start",
                flexDirection: { xs: "column", sm: "row" },
              }}
            >
              <Box
                component="img"
                src={deleteTarget.imageUrl}
                sx={{
                  width: { xs: "100%", sm: 120 },
                  height: { xs: 120, sm: 75 },
                  borderRadius: 2,
                  objectFit: "cover",
                  border: `1px solid ${colors.border}`,
                  flexShrink: 0,
                }}
              />
              <div>
                <p
                  style={{
                    margin: 0,
                    color: colors.textPrimary,
                    fontWeight: 600,
                  }}
                >
                  Delete this slide?
                </p>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: "0.875rem",
                    color: colors.textSecondary,
                  }}
                >
                  This will permanently remove the image from Storage and the
                  right section slideshow.
                </p>
              </div>
            </Box>
          )}
          <Box
            sx={{
              mt: 2,
              bgcolor: colors.errorBg,
              border: `1px solid ${colors.error}`,
              borderRadius: 2,
              p: 2,
            }}
          >
            <p style={{ fontSize: "0.85rem", color: colors.error, margin: 0 }}>
              <strong>Warning:</strong> This action cannot be undone.
            </p>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 2, sm: 3 }, gap: 1 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
            variant="outlined"
            sx={{
              textTransform: "none",
              borderColor: colors.border,
              color: colors.textPrimary,
              borderRadius: 2,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting}
            variant="contained"
            startIcon={
              deleting ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <Trash2 size={15} />
              )
            }
            sx={{
              textTransform: "none",
              bgcolor: colors.error,
              "&:hover": { bgcolor: "#DC2626" },
              borderRadius: 2,
              minWidth: 100,
            }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

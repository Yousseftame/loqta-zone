/**
 * HeroSlidesList.tsx — Admin panel page
 *
 * Features:
 *  - Upload new slide images (drag & drop or click)
 *  - Drag-to-reorder slides (mouse + touch)
 *  - Toggle active/inactive per slide
 *  - Delete slides
 *  - Live preview count badge
 *  - Consistent visual language with existing admin pages (navy #2A4863, #EFF6FF headers)
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
  Images,
  Upload,
  Trash2,
  AlertTriangle,
  GripVertical,
  RefreshCw,
  Eye,
  EyeOff,
  ImageIcon,
  Plus,
} from "lucide-react";
import { useHeroSlides } from "@/store/AdminContext/HeroSlideContext/HeroSlideContext";
import type { HeroSlide } from "@/service/heroSlide/heroSlideService";

// ─── Shared colour tokens (same as products-data.ts) ─────────────────────────
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

// ─── Drag-and-drop reorder hook ───────────────────────────────────────────────

function useDragReorder(
  items: HeroSlide[],
  onReorder: (orderedIds: string[]) => Promise<void>,
) {
  const draggingId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    draggingId.current = id;
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

    const ids = items.map((s) => s.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;

    const newIds = [...ids];
    newIds.splice(from, 1);
    newIds.splice(to, 0, sourceId);
    await onReorder(newIds);
  };

  const handleDragEnd = () => {
    draggingId.current = null;
    setDragOverId(null);
  };

  return {
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    dragOverId,
  };
}

// ─── Upload zone component ────────────────────────────────────────────────────

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
        p: 4,
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

export default function HeroSlidesList() {
  const {
    slides,
    loading,
    error,
    refreshSlides,
    addSlide,
    toggleActive,
    reorder,
    removeSlide,
  } = useHeroSlides();

  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<HeroSlide | null>(null);
  const [deleting, setDeleting] = useState(false);

  const drag = useDragReorder(slides, reorder);

  // ── Collect files before upload ───────────────────────────────────────────
  const handleFileQueued = useCallback((file: File) => {
    setPendingFiles((prev) => [...prev, file]);
    setPendingPreviews((prev) => [...prev, URL.createObjectURL(file)]);
  }, []);

  const removePending = (i: number) => {
    URL.revokeObjectURL(pendingPreviews[i]);
    setPendingFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPendingPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  // ── Upload all queued files ───────────────────────────────────────────────
  const handleUploadAll = async () => {
    if (!pendingFiles.length) return;
    setUploading(true);
    for (const file of pendingFiles) {
      try {
        await addSlide({ imageFile: file, isActive: true });
      } catch {
        // toast already shown
      }
    }
    pendingPreviews.forEach((url) => URL.revokeObjectURL(url));
    setPendingFiles([]);
    setPendingPreviews([]);
    setUploading(false);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
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
        p: { xs: 2, md: 3 },
        bgcolor: "#F8FAFC",
        minHeight: "100vh",
      }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          mb: 4,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { sm: "center" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <div>
          <h1
            style={{
              color: colors.primary,
              margin: 0,
              fontSize: "1.75rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Images
              size={28}
              style={{ display: "inline", verticalAlign: "middle" }}
            />
            Hero Slides
          </h1>
          <p
            style={{
              color: colors.textSecondary,
              margin: "4px 0 0",
              fontSize: "0.875rem",
            }}
          >
            Manage homepage slideshow — drag to reorder, toggle to show/hide
          </p>
        </div>
        <IconButton
          onClick={refreshSlides}
          sx={{
            color: colors.primary,
            border: `1px solid ${colors.border}`,
            borderRadius: 2,
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
          gap: 3,
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          mb: 4,
        }}
      >
        {[
          {
            label: "Total Slides",
            value: slides.length,
            icon: <ImageIcon size={22} />,
          },
          {
            label: "Active (Visible)",
            value: activeCount,
            icon: <Eye size={22} />,
          },
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
                    fontSize: "0.7rem",
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
                    fontSize: "2rem",
                    fontWeight: 700,
                    margin: "4px 0 0",
                  }}
                >
                  {value}
                </p>
              </div>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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
            px: 3,
            py: 2.5,
            borderBottom: `1px solid ${colors.border}`,
            bgcolor: colors.primaryBg,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Plus size={18} style={{ color: colors.primary }} />
          <span
            style={{
              fontWeight: 700,
              color: colors.primary,
              fontSize: "0.95rem",
            }}
          >
            Add New Slides
          </span>
        </Box>
        <Box sx={{ p: 3 }}>
          <UploadZone onUpload={handleFileQueued} />

          {/* Pending previews */}
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
                    sx={{ position: "relative", width: 90, height: 60 }}
                  >
                    <Box
                      component="img"
                      src={url}
                      sx={{
                        width: 90,
                        height: 60,
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
                startIcon={
                  uploading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Upload size={16} />
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
            px: 3,
            py: 2.5,
            borderBottom: `1px solid ${colors.border}`,
            bgcolor: colors.primaryBg,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Images size={18} style={{ color: colors.primary }} />
          <span
            style={{
              fontWeight: 700,
              color: colors.primary,
              fontSize: "0.95rem",
            }}
          >
            Slides ({slides.length})
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "0.75rem",
              color: colors.textMuted,
            }}
          >
            Drag{" "}
            <GripVertical
              size={12}
              style={{ display: "inline", verticalAlign: "middle" }}
            />{" "}
            to reorder
          </span>
        </Box>

        {slides.length === 0 ? (
          <Box sx={{ p: 8, textAlign: "center" }}>
            <ImageIcon
              size={44}
              style={{
                color: colors.textMuted,
                margin: "0 auto 12px",
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
                fontSize: "0.85rem",
                margin: "4px 0 0",
              }}
            >
              Upload your first hero image above
            </p>
          </Box>
        ) : (
          <Box
            sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}
          >
            {slides.map((slide, index) => (
              <Box
                key={slide.id}
                draggable
                onDragStart={() => drag.handleDragStart(slide.id)}
                onDragOver={(e) => drag.handleDragOver(e, slide.id)}
                onDrop={(e) => drag.handleDrop(e, slide.id)}
                onDragEnd={drag.handleDragEnd}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  p: 1.5,
                  borderRadius: 2,
                  border: `1px solid ${drag.dragOverId === slide.id ? colors.primary : colors.border}`,
                  bgcolor:
                    drag.dragOverId === slide.id ? colors.primaryBg : "#fff",
                  transition: "all 0.15s",
                  cursor: "grab",
                  "&:active": { cursor: "grabbing" },
                }}
              >
                {/* Drag handle */}
                <GripVertical
                  size={18}
                  style={{ color: colors.textMuted, flexShrink: 0 }}
                />

                {/* Order badge */}
                <Box
                  sx={{
                    width: 28,
                    height: 28,
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
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: colors.primary,
                    }}
                  >
                    {index + 1}
                  </span>
                </Box>

                {/* Image preview */}
                <Box
                  component="img"
                  src={slide.imageUrl}
                  alt={`slide-${index + 1}`}
                  sx={{
                    width: { xs: 80, sm: 140 },
                    height: { xs: 50, sm: 80 },
                    borderRadius: 2,
                    objectFit: "cover",
                    border: `1px solid ${colors.border}`,
                    flexShrink: 0,
                  }}
                />

                {/* Info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      color: colors.textPrimary,
                    }}
                  >
                    Slide {index + 1}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "0.75rem",
                      color: colors.textMuted,
                    }}
                  >
                    Added {slide.createdAt.toLocaleDateString()}
                  </p>
                </Box>

                {/* Active toggle */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexShrink: 0,
                  }}
                >
                  <Chip
                    icon={
                      slide.isActive ? <Eye size={12} /> : <EyeOff size={12} />
                    }
                    label={slide.isActive ? "Visible" : "Hidden"}
                    size="small"
                    sx={{
                      bgcolor: slide.isActive ? colors.successBg : "#F1F5F9",
                      color: slide.isActive ? colors.success : colors.textMuted,
                      fontWeight: 700,
                      fontSize: "0.68rem",
                      display: { xs: "none", sm: "flex" },
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

                {/* Delete */}
                <IconButton
                  size="small"
                  onClick={() => setDeleteTarget(slide)}
                  sx={{
                    color: colors.error,
                    "&:hover": { bgcolor: colors.errorBg },
                    borderRadius: 1.5,
                    flexShrink: 0,
                  }}
                  title="Delete slide"
                >
                  <Trash2 size={16} />
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
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            color: colors.error,
          }}
        >
          <AlertTriangle size={22} /> Confirm Deletion
        </DialogTitle>
        <DialogContent>
          {deleteTarget && (
            <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
              <Box
                component="img"
                src={deleteTarget.imageUrl}
                sx={{
                  width: 120,
                  height: 75,
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
                  homepage slideshow.
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
            <p style={{ fontSize: "0.875rem", color: colors.error, margin: 0 }}>
              <strong>Warning:</strong> This action cannot be undone.
            </p>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
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
                <Trash2 size={16} />
              )
            }
            sx={{
              textTransform: "none",
              bgcolor: colors.error,
              "&:hover": { bgcolor: "#DC2626" },
              borderRadius: 2,
              minWidth: 110,
            }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

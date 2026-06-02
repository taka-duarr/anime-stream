import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";

interface CommentSectionProps {
  animeId: string;
  navigation: any;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  animeId,
  navigation,
}) => {
  const { colors } = useTheme();
  const { isAuthenticated, username } = useAuth();

  const [comments, setComments] = useState<api.Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  useEffect(() => {
    console.log("[COMMENT SECTION] Component mounted with animeId:", animeId);
    if (!animeId) {
      console.error("[COMMENT SECTION] ERROR: animeId is undefined or null!");
      return;
    }
    loadComments();
  }, [animeId]);

  // ============================================
  // LOAD COMMENTS
  // ============================================

  const loadComments = async () => {
    try {
      setLoading(true);
      console.log("[COMMENT SECTION] Loading comments for anime:", animeId);
      const fetchedComments = await api.getComments(animeId);

      const commentMap = new Map<number, api.Comment>();
      const rootComments: api.Comment[] = [];

      fetchedComments.forEach((comment) => {
        commentMap.set(comment.id, { ...comment, replies: [] });
      });

      fetchedComments.forEach((comment) => {
        const commentWithReplies = commentMap.get(comment.id)!;
        if (comment.parent_id === null) {
          rootComments.push(commentWithReplies);
        } else {
          const parent = commentMap.get(comment.parent_id);
          if (parent) {
            if (!parent.replies) parent.replies = [];
            parent.replies.push(commentWithReplies);
          }
        }
      });

      setComments(rootComments);
    } catch (error: any) {
      console.error("[COMMENT SECTION] Failed to load comments:", error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // SUBMIT COMMENT OR REPLY
  // ============================================

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      Alert.alert("Error", "Komentar tidak boleh kosong");
      return;
    }

    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    try {
      setSubmitting(true);
      if (editingComment) {
        await api.editComment(editingComment, commentText);
        setEditingComment(null);
      } else {
        await api.addComment(animeId, commentText, replyingTo || undefined);
        setReplyingTo(null);
      }
      setCommentText("");
      await loadComments();
    } catch (error: any) {
      console.error("[COMMENT SECTION] Failed to submit comment:", error);
      let errorTitle = "Gagal Mengirim Komentar";
      let errorMessage = "Terjadi kesalahan saat mengirim komentar.";
      if (error.response?.status === 401) {
        errorTitle = "Sesi Berakhir";
        errorMessage = "Sesi login Anda telah berakhir. Silakan login kembali.";
      } else if (error.response?.status === 403) {
        errorTitle = "Akses Ditolak";
        errorMessage = "Anda tidak memiliki izin untuk melakukan aksi ini.";
      } else if (error.response?.status === 400) {
        errorTitle = "Data Tidak Valid";
        errorMessage =
          error.response?.data?.error ||
          error.response?.data?.message ||
          "Komentar tidak valid. Periksa kembali isi komentar.";
      } else if (error.response?.status === 500) {
        errorTitle = "Server Bermasalah";
        errorMessage = "Terjadi kesalahan pada server. Coba lagi nanti.";
      } else if (error.message?.includes("Network Error")) {
        errorTitle = "Tidak Ada Koneksi";
        errorMessage = "Tidak dapat terhubung ke server.";
      }
      Alert.alert(errorTitle, errorMessage, [{ text: "OK" }]);
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // DELETE COMMENT
  // ============================================

  // Opens the custom delete confirmation modal (cross-platform: works on web & mobile)
  const handleDeleteComment = (commentId: number) => {
    setDeleteTargetId(commentId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await api.deleteComment(deleteTargetId);
      await loadComments();
    } catch (error: any) {
      console.error("[COMMENT SECTION] Failed to delete comment:", error);
    } finally {
      setShowDeleteModal(false);
      setDeleteTargetId(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteTargetId(null);
  };

  // ============================================
  // EDIT COMMENT
  // ============================================

  const handleEditComment = (comment: api.Comment) => {
    setEditingComment(comment.id);
    setCommentText(comment.content);
    setReplyingTo(null);
  };

  // ============================================
  // REPLY — Cek Auth Langsung
  // ============================================

  const handleReplyComment = (comment: api.Comment) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    setReplyingTo(comment.id);
    setEditingComment(null);
    setCommentText("");
  };

  // ============================================
  // CANCEL
  // ============================================

  const handleCancel = () => {
    setReplyingTo(null);
    setEditingComment(null);
    setCommentText("");
  };

  // ============================================
  // LOGIN MODAL — Themed
  // ============================================

  const renderLoginModal = () => (
    <Modal
      visible={showLoginModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowLoginModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowLoginModal(false)}
      >
        <TouchableOpacity
          style={[styles.modalCard, { backgroundColor: colors.card }]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <View
            style={[
              styles.modalIconWrap,
              { backgroundColor: colors.accent + "20" },
            ]}
          >
            <Ionicons name="lock-closed" size={36} color={colors.accent} />
          </View>

          {/* Title */}
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Login Diperlukan
          </Text>

          {/* Subtitle */}
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            Anda harus login terlebih dahulu untuk dapat menulis komentar atau
            membalas komentar orang lain.
          </Text>

          {/* Divider */}
          <View
            style={[styles.modalDivider, { backgroundColor: colors.border }]}
          />

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.modalLoginBtn, { backgroundColor: colors.accent }]}
            activeOpacity={0.85}
            onPress={() => {
              setShowLoginModal(false);
              navigation.navigate("Login");
            }}
          >
            <Ionicons
              name="log-in-outline"
              size={20}
              color="#FFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.modalLoginBtnText}>Login Sekarang</Text>
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={[
              styles.modalCancelBtn,
              {
                backgroundColor: colors.bgSecondary,
                borderColor: colors.border,
              },
            ]}
            activeOpacity={0.8}
            onPress={() => setShowLoginModal(false)}
          >
            <Text
              style={[
                styles.modalCancelBtnText,
                { color: colors.textSecondary },
              ]}
            >
              Batal
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  // ============================================
  // RENDER COMMENT ITEM
  // ============================================

  const renderComment = (comment: api.Comment, isReply: boolean = false) => {
    const isOwnComment =
      !!isAuthenticated &&
      !!username &&
      (comment.username || "").toLowerCase() === username.toLowerCase();
    const displayUsername =
      comment.username ||
      comment.user?.username ||
      `User ${comment.user_id || comment.user?.id || "Unknown"}`;
    const avatarLetter = displayUsername.charAt(0).toUpperCase();

    return (
      <View key={comment.id} style={styles.commentContainer}>
        <View style={[styles.commentItem, isReply && styles.replyItem]}>
          {/* Avatar */}
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>

          {/* Content */}
          <View style={styles.contentArea}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.userInfoRow}>
                <Text style={[styles.username, { color: colors.text }]}>
                  {displayUsername}
                </Text>
                {isOwnComment && (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: colors.accent + "20" },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: colors.accent }]}>
                      YOU
                    </Text>
                  </View>
                )}
                <Text style={[styles.timestamp, { color: colors.textMuted }]}>
                  •{" "}
                  {new Date(comment.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                  })}
                </Text>
              </View>

              {/* Edit / Delete */}
              {isOwnComment && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    onPress={() => handleEditComment(comment)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name="create-outline"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteComment(comment.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={colors.accent}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Comment Text */}
            <Text style={[styles.commentText, { color: colors.text }]}>
              {comment.content || ""}
            </Text>

            {/* Actions */}
            <View style={styles.interactionRow}>
              <TouchableOpacity style={styles.interactionBtn}>
                <Ionicons
                  name="heart-outline"
                  size={16}
                  color={colors.textMuted}
                />
                <Text
                  style={[styles.interactionText, { color: colors.textMuted }]}
                >
                  0
                </Text>
              </TouchableOpacity>

              {!isReply && (
                <TouchableOpacity
                  onPress={() => handleReplyComment(comment)}
                  style={styles.interactionBtn}
                >
                  <Ionicons
                    name="arrow-undo-outline"
                    size={16}
                    color={colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.interactionText,
                      { color: colors.textMuted },
                    ]}
                  >
                    Balas
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Replies */}
        {!isReply && comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesSection}>
            {comment.replies.map((reply) => renderComment(reply, true))}
          </View>
        )}
      </View>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  // ============================================
  // DELETE CONFIRM MODAL — Cross-platform (Web + Mobile)
  // ============================================

  const renderDeleteModal = () => (
    <Modal
      visible={showDeleteModal}
      transparent
      animationType="fade"
      onRequestClose={cancelDelete}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={cancelDelete}
      >
        <TouchableOpacity
          style={[styles.modalCard, { backgroundColor: colors.card }]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <View
            style={[
              styles.modalIconWrap,
              { backgroundColor: "#FF474720" },
            ]}
          >
            <Ionicons name="trash" size={36} color="#FF4747" />
          </View>

          {/* Title */}
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Hapus Komentar?
          </Text>

          {/* Subtitle */}
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            Komentar yang dihapus tidak dapat dikembalikan. Apakah Anda yakin
            ingin menghapus komentar ini?
          </Text>

          {/* Divider */}
          <View
            style={[styles.modalDivider, { backgroundColor: colors.border }]}
          />

          {/* Delete Button */}
          <TouchableOpacity
            style={[styles.modalLoginBtn, { backgroundColor: "#FF4747" }]}
            activeOpacity={0.85}
            onPress={confirmDelete}
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color="#FFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.modalLoginBtnText}>Ya, Hapus</Text>
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={[
              styles.modalCancelBtn,
              {
                backgroundColor: colors.bgSecondary,
                borderColor: colors.border,
              },
            ]}
            activeOpacity={0.8}
            onPress={cancelDelete}
          >
            <Text
              style={[
                styles.modalCancelBtnText,
                { color: colors.textSecondary },
              ]}
            >
              Batal
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Login Modal */}
      {renderLoginModal()}

      {/* Delete Confirm Modal */}
      {renderDeleteModal()}

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Ionicons name="chatbubbles" size={24} color={colors.accent} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Komentar ({comments.length})
        </Text>
      </View>

      {/* Input Area */}
      <View style={[styles.inputContainer, { backgroundColor: colors.card }]}>
        {/* Reply/Edit Banner */}
        {(replyingTo || editingComment) && (
          <View
            style={[
              styles.actionBanner,
              { backgroundColor: colors.bgSecondary },
            ]}
          >
            <Text
              style={[styles.actionBannerText, { color: colors.textSecondary }]}
            >
              {editingComment ? "Mengedit komentar" : "Membalas komentar"}
            </Text>
            <TouchableOpacity onPress={handleCancel}>
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Guest Prompt Banner */}
        {!isAuthenticated && (
          <TouchableOpacity
            style={[
              styles.guestBanner,
              {
                backgroundColor: colors.accent + "15",
                borderColor: colors.accent + "40",
              },
            ]}
            activeOpacity={0.8}
            onPress={() => setShowLoginModal(true)}
          >
            <Ionicons
              name="lock-closed-outline"
              size={16}
              color={colors.accent}
            />
            <Text style={[styles.guestBannerText, { color: colors.accent }]}>
              Login untuk menulis komentar
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.accent} />
          </TouchableOpacity>
        )}

        {/* Input Row */}
        <View style={styles.inputRow}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={isAuthenticated ? 1 : 0.7}
            onPress={!isAuthenticated ? () => setShowLoginModal(true) : undefined}
          >
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bgSecondary,
                  color: colors.text,
                  borderColor: colors.border,
                  opacity: isAuthenticated ? 1 : 0.5,
                },
              ]}
              placeholder={
                !isAuthenticated
                  ? "Login untuk berkomentar..."
                  : editingComment
                  ? "Edit komentar Anda..."
                  : replyingTo
                  ? "Tulis balasan Anda..."
                  : "Tulis komentar Anda..."
              }
              placeholderTextColor={colors.textMuted}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
              editable={!!isAuthenticated}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: colors.accent },
              (!commentText.trim() || submitting || !isAuthenticated) &&
                styles.sendButtonDisabled,
            ]}
            onPress={
              isAuthenticated
                ? handleSubmitComment
                : () => setShowLoginModal(true)
            }
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons
                name={isAuthenticated ? "send" : "lock-closed"}
                size={20}
                color="#FFF"
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Comment List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Memuat komentar...
          </Text>
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="chatbubble-outline"
            size={48}
            color={colors.textMuted}
          />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Belum ada komentar
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
            Jadilah yang pertama berkomentar!
          </Text>
        </View>
      ) : (
        <View style={styles.commentsList}>
          {comments.map((comment) => renderComment(comment))}
        </View>
      )}
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  inputContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  actionBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionBannerText: {
    fontSize: 13,
    fontWeight: "600",
  },
  guestBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  guestBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  commentsList: {
    paddingHorizontal: 16,
  },
  commentContainer: {
    marginBottom: 16,
  },
  commentItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  replyItem: {
    marginLeft: 48,
    paddingVertical: 6,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  contentArea: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  userInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  username: {
    fontSize: 14,
    fontWeight: "700",
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  timestamp: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  interactionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  interactionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
  },
  interactionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  repliesSection: {
    marginTop: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalDivider: {
    width: "100%",
    height: 1,
    marginBottom: 20,
  },
  modalLoginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  modalLoginBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  modalCancelBtn: {
    width: "100%",
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
});

export default CommentSection;

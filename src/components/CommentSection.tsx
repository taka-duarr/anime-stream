import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
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
      console.log(
        "[COMMENT SECTION] Raw fetched comments:",
        JSON.stringify(fetchedComments, null, 2),
      );

      // Group replies under their parent comments
      const commentMap = new Map<number, api.Comment>();
      const rootComments: api.Comment[] = [];

      // First pass: create map of all comments
      fetchedComments.forEach((comment) => {
        commentMap.set(comment.id, { ...comment, replies: [] });
      });

      // Second pass: organize into tree structure
      fetchedComments.forEach((comment) => {
        const commentWithReplies = commentMap.get(comment.id)!;

        if (comment.parent_id === null) {
          // This is a root comment
          rootComments.push(commentWithReplies);
        } else {
          // This is a reply, add it to parent's replies array
          const parent = commentMap.get(comment.parent_id);
          if (parent) {
            if (!parent.replies) {
              parent.replies = [];
            }
            parent.replies.push(commentWithReplies);
          }
        }
      });

      console.log(
        "[COMMENT SECTION] Organized comments:",
        JSON.stringify(rootComments, null, 2),
      );
      setComments(rootComments);
    } catch (error: any) {
      console.error("[COMMENT SECTION] Failed to load comments:", error);
      console.error("[COMMENT SECTION] Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // ADD COMMENT OR REPLY
  // ============================================

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      Alert.alert("Error", "Komentar tidak boleh kosong");
      return;
    }

    if (!isAuthenticated) {
      Alert.alert(
        "Login Diperlukan",
        "Anda harus login untuk mengomentari anime",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Login",
            onPress: () => {
              navigation.navigate("Login");
            },
          },
        ],
      );
      return;
    }

    try {
      setSubmitting(true);

      if (editingComment) {
        // Edit existing comment
        await api.editComment(editingComment, commentText);
        setEditingComment(null);
      } else {
        // Add new comment or reply
        await api.addComment(animeId, commentText, replyingTo || undefined);
        setReplyingTo(null);
      }

      setCommentText("");
      await loadComments();
    } catch (error: any) {
      console.error("[COMMENT SECTION] Failed to submit comment:", error);
      console.error("[COMMENT SECTION] Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        animeId: animeId,
        commentText: commentText,
        isEdit: !!editingComment,
        isReply: !!replyingTo,
      });

      // Determine error message based on error type
      let errorTitle = "Gagal Mengirim Komentar";
      let errorMessage = "";

      if (error.response?.status === 401) {
        errorTitle = "Sesi Berakhir";
        errorMessage =
          "Sesi login Anda telah berakhir. Silakan login kembali untuk melanjutkan.";
      } else if (error.response?.status === 403) {
        errorTitle = "Akses Ditolak";
        errorMessage = "Anda tidak memiliki izin untuk melakukan aksi ini.";
      } else if (error.response?.status === 400) {
        errorTitle = "Data Tidak Valid";
        errorMessage =
          error.response?.data?.error ||
          error.response?.data?.message ||
          "Komentar yang Anda kirim tidak valid. Periksa kembali isi komentar.";
      } else if (error.response?.status === 500) {
        errorTitle = "Server Bermasalah";
        errorMessage =
          "Terjadi kesalahan pada server. Silakan coba lagi dalam beberapa saat.";
      } else if (
        error.code === "ECONNABORTED" ||
        error.message?.includes("timeout")
      ) {
        errorTitle = "Koneksi Timeout";
        errorMessage =
          "Koneksi ke server terlalu lama. Periksa koneksi internet Anda dan coba lagi.";
      } else if (error.message?.includes("Network Error")) {
        errorTitle = "Tidak Ada Koneksi";
        errorMessage =
          "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
      } else {
        errorTitle = "Gagal Mengirim Komentar";
        errorMessage =
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.";
      }

      Alert.alert(errorTitle, errorMessage, [{ text: "OK", style: "default" }]);
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // DELETE COMMENT
  // ============================================

  const handleDeleteComment = async (commentId: number) => {
    Alert.alert(
      "Hapus Komentar",
      "Apakah Anda yakin ingin menghapus komentar ini? Semua balasan juga akan terhapus.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteComment(commentId);
              await loadComments();
            } catch (error: any) {
              console.error(
                "[COMMENT SECTION] Failed to delete comment:",
                error,
              );
              console.error("[COMMENT SECTION] Error details:", {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                commentId: commentId,
                animeId: animeId,
              });

              // Determine error message based on error type
              let errorTitle = "Gagal Menghapus Komentar";
              let errorMessage = "";

              if (error.response?.status === 401) {
                errorTitle = "Sesi Berakhir";
                errorMessage =
                  "Sesi login Anda telah berakhir. Silakan login kembali untuk melanjutkan.";
              } else if (error.response?.status === 403) {
                errorTitle = "Akses Ditolak";
                errorMessage =
                  "Anda tidak memiliki izin untuk menghapus komentar ini. Hanya pemilik komentar yang dapat menghapusnya.";
              } else if (error.response?.status === 404) {
                errorTitle = "Komentar Tidak Ditemukan";
                errorMessage =
                  "Komentar yang ingin Anda hapus tidak ditemukan. Mungkin sudah dihapus sebelumnya.";
              } else if (error.response?.status === 500) {
                errorTitle = "Server Bermasalah";
                errorMessage =
                  "Terjadi kesalahan pada server. Silakan coba lagi dalam beberapa saat.";
              } else if (
                error.code === "ECONNABORTED" ||
                error.message?.includes("timeout")
              ) {
                errorTitle = "Koneksi Timeout";
                errorMessage =
                  "Koneksi ke server terlalu lama. Periksa koneksi internet Anda dan coba lagi.";
              } else if (error.message?.includes("Network Error")) {
                errorTitle = "Tidak Ada Koneksi";
                errorMessage =
                  "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
              } else {
                errorTitle = "Gagal Menghapus Komentar";
                errorMessage =
                  error.response?.data?.error ||
                  error.response?.data?.message ||
                  error.message ||
                  "Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.";
              }

              Alert.alert(errorTitle, errorMessage, [
                { text: "OK", style: "default" },
              ]);
            }
          },
        },
      ],
    );
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
  // REPLY TO COMMENT
  // ============================================

  const handleReplyComment = (comment: api.Comment) => {
    setReplyingTo(comment.id);
    setEditingComment(null);
    setCommentText("");
  };

  // ============================================
  // CANCEL ACTION
  // ============================================

  const handleCancel = () => {
    setReplyingTo(null);
    setEditingComment(null);
    setCommentText("");
  };

  // ============================================
  // RENDER COMMENT ITEM
  // ============================================

  const renderComment = (comment: api.Comment, isReply: boolean = false) => {
    const isOwnComment = isAuthenticated && comment.username === username;

    // Get username from either flat structure or nested user object
    const displayUsername =
      comment.username ||
      comment.user?.username ||
      `User ${comment.user_id || comment.user?.id || "Unknown"}`;
    const avatarLetter = displayUsername.charAt(0).toUpperCase();

    return (
      <View key={comment.id} style={styles.commentContainer}>
        {/* Comment Item */}
        <View style={[styles.commentItem, isReply && styles.replyItem]}>
          {/* Avatar */}
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>

          {/* Content Area */}
          <View style={styles.contentArea}>
            {/* Header: Username, Badge, Timestamp */}
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

              {/* Edit/Delete Buttons */}
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

            {/* Interaction Buttons */}
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

        {/* Render Replies */}
        {!isReply && comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesSection}>
            {comment.replies.map((reply) => renderComment(reply, true))}
          </View>
        )}
      </View>
    );
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Ionicons name="chatbubbles" size={24} color={colors.accent} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Komentar ({comments.length})
        </Text>
      </View>

      {/* Comment Input */}
      <View style={[styles.inputContainer, { backgroundColor: colors.card }]}>
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
              {editingComment ? "Mengedit komentar" : `Membalas komentar`}
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

        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.bgSecondary,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder={
              editingComment
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
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: colors.accent },
              (!commentText.trim() || submitting) && styles.sendButtonDisabled,
            ]}
            onPress={handleSubmitComment}
            disabled={!commentText.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Comments List */}
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
          {comments.map((comment) => {
            try {
              return renderComment(comment);
            } catch (error) {
              console.error(
                "[COMMENT SECTION] Error rendering comment:",
                error,
              );
              console.error("[COMMENT SECTION] Anime ID:", animeId);
              console.error(
                "[COMMENT SECTION] Comment data:",
                JSON.stringify(comment, null, 2),
              );
              return null;
            }
          })}
        </View>
      )}
    </View>
  );
};

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
  // MINIMALIST COMMENT STYLES
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
});

export default CommentSection;

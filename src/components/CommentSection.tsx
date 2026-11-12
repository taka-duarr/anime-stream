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
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import { Glass, glassWebStyle, FadeIn, Shimmer } from "./ui";

interface CommentSectionProps {
  animeId: string;
  navigation: any;
}

const formatTimeAgo = (dateStr?: string) => {
  if (!dateStr) return "";
  try {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "Baru saja";
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}h lalu`;
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
};

const CommentSection: React.FC<CommentSectionProps> = ({
  animeId,
  navigation,
}) => {
  const { colors } = useTheme();
  const { isAuthenticated, username } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 768;

  const [comments, setComments] = useState<api.Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");
  const [likesMap, setLikesMap] = useState<Record<number, { likes: number; liked: boolean }>>({});

  useEffect(() => {
    if (!animeId) return;
    loadComments();
  }, [animeId]);

  // ============================================
  // LOAD COMMENTS
  // ============================================

  const loadComments = async () => {
    try {
      setLoading(true);
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
          const parent = commentMap.get(comment.parent_id!);
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
  // EDIT & REPLY
  // ============================================

  const handleEditComment = (comment: api.Comment) => {
    setEditingComment(comment.id);
    setCommentText(comment.content);
    setReplyingTo(null);
  };

  const handleReplyComment = (comment: api.Comment) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    setReplyingTo(comment.id);
    setEditingComment(null);
    setCommentText("");
  };

  const handleCancel = () => {
    setReplyingTo(null);
    setEditingComment(null);
    setCommentText("");
  };

  const handleLike = (id: number) => {
    setLikesMap((prev) => {
      const current = prev[id] || { likes: 0, liked: false };
      return {
        ...prev,
        [id]: {
          likes: current.liked ? current.likes - 1 : current.likes + 1,
          liked: !current.liked,
        },
      };
    });
  };

  // Sorted Comments
  const displayedComments = [...comments].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return sortOrder === "latest" ? timeB - timeA : timeA - timeB;
  });

  // ============================================
  // LOGIN MODAL — Glassmorphic
  // ============================================

  const renderLoginModal = () => (
    <Modal
      visible={showLoginModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowLoginModal(false)}
    >
      <TouchableOpacity
        style={[styles.modalOverlay, glassWebStyle(24)]}
        activeOpacity={1}
        onPress={() => setShowLoginModal(false)}
      >
        <TouchableOpacity
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.glassStrong,
              borderColor: colors.glassBorder,
            },
            glassWebStyle(36),
          ]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Glowing Icon */}
          <View
            style={[
              styles.modalIconWrap,
              {
                backgroundColor: colors.accent + "18",
                borderColor: colors.accent + "40",
              },
            ]}
          >
            <Ionicons name="lock-closed" size={32} color={colors.accent} />
          </View>

          {/* Title */}
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Login Diperlukan
          </Text>

          {/* Subtitle */}
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            Masuk untuk menulis komentar, membalas diskusi, atau berinteraksi dengan komunitas.
          </Text>

          {/* Divider */}
          <View
            style={[styles.modalDivider, { backgroundColor: colors.glassBorder }]}
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
              size={18}
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
                backgroundColor: colors.searchBg,
                borderColor: colors.glassBorder,
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
  // DELETE CONFIRM MODAL — Glassmorphic
  // ============================================

  const renderDeleteModal = () => (
    <Modal
      visible={showDeleteModal}
      transparent
      animationType="fade"
      onRequestClose={cancelDelete}
    >
      <TouchableOpacity
        style={[styles.modalOverlay, glassWebStyle(24)]}
        activeOpacity={1}
        onPress={cancelDelete}
      >
        <TouchableOpacity
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.glassStrong,
              borderColor: colors.glassBorder,
            },
            glassWebStyle(36),
          ]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Glowing Red Icon */}
          <View
            style={[
              styles.modalIconWrap,
              {
                backgroundColor: "rgba(239, 68, 68, 0.16)",
                borderColor: "rgba(239, 68, 68, 0.4)",
              },
            ]}
          >
            <Ionicons name="trash-outline" size={32} color="#EF4444" />
          </View>

          {/* Title */}
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Hapus Komentar?
          </Text>

          {/* Subtitle */}
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            Komentar yang dihapus tidak dapat dipulihkan. Apakah Anda yakin ingin menghapusnya?
          </Text>

          {/* Divider */}
          <View
            style={[styles.modalDivider, { backgroundColor: colors.glassBorder }]}
          />

          {/* Delete Button */}
          <TouchableOpacity
            style={[styles.modalLoginBtn, { backgroundColor: "#EF4444" }]}
            activeOpacity={0.85}
            onPress={confirmDelete}
          >
            <Ionicons
              name="trash-outline"
              size={18}
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
                backgroundColor: colors.searchBg,
                borderColor: colors.glassBorder,
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

  // ============================================
  // RENDER COMMENT ITEM — Glassmorphic Card
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
    const timeAgo = formatTimeAgo(comment.created_at);
    const likeData = likesMap[comment.id] || { likes: 0, liked: false };

    return (
      <View key={comment.id} style={styles.commentContainer}>
        <View
          style={[
            styles.commentCard,
            isReply ? styles.replyCard : null,
            {
              backgroundColor: isReply ? colors.searchBg : colors.glass,
              borderColor: colors.glassBorder,
            },
            glassWebStyle(isReply ? 12 : 20),
          ]}
        >
          {/* Avatar with accent ring glow */}
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: colors.accent + "22",
                borderColor: colors.accent + "50",
              },
            ]}
          >
            <Text style={[styles.avatarText, { color: colors.accent }]}>
              {avatarLetter}
            </Text>
          </View>

          {/* Content */}
          <View style={styles.contentArea}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.userInfoRow}>
                <Text style={[styles.username, { color: colors.text }]}>
                  {displayUsername}
                </Text>

                {isDesktop && (
                  <>
                    <View
                      style={[
                        styles.levelPill,
                        {
                          backgroundColor: colors.searchBg,
                          borderColor: colors.glassBorder,
                        },
                      ]}
                    >
                      <Text style={[styles.userLevel, { color: colors.textSecondary }]}>
                        Otaku
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.modBadge,
                        {
                          backgroundColor: colors.accent + "20",
                          borderColor: colors.accent + "40",
                        },
                      ]}
                    >
                      <Text style={[styles.modBadgeText, { color: colors.accent }]}>
                        Member
                      </Text>
                    </View>
                  </>
                )}

                {isOwnComment && (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: colors.accent + "20",
                        borderColor: colors.accent + "45",
                      },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: colors.accent }]}>
                      YOU
                    </Text>
                  </View>
                )}

                <View style={styles.timestampWrap}>
                  <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                  <Text style={[styles.timestampText, { color: colors.textMuted }]}>
                    {timeAgo}
                  </Text>
                </View>
              </View>

              {/* Edit / Delete Buttons */}
              {isOwnComment && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.iconCircleBtn,
                      {
                        backgroundColor: colors.searchBg,
                        borderColor: colors.glassBorder,
                      },
                    ]}
                    onPress={() => handleEditComment(comment)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name="create-outline"
                      size={13}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.iconCircleBtn,
                      {
                        backgroundColor: "rgba(239, 68, 68, 0.12)",
                        borderColor: "rgba(239, 68, 68, 0.3)",
                      },
                    ]}
                    onPress={() => handleDeleteComment(comment.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={13}
                      color="#EF4444"
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Comment Text */}
            <Text style={[styles.commentText, { color: colors.text }]}>
              {comment.content || ""}
            </Text>

            {/* Interaction Row */}
            <View style={styles.interactionRow}>
              {/* Thumbs up / Like */}
              <TouchableOpacity
                style={[
                  styles.pillBtn,
                  {
                    backgroundColor: likeData.liked
                      ? colors.accent + "20"
                      : colors.searchBg,
                    borderColor: likeData.liked
                      ? colors.accent + "50"
                      : colors.glassBorder,
                  },
                ]}
                onPress={() => handleLike(comment.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={likeData.liked ? "thumbs-up" : "thumbs-up-outline"}
                  size={13}
                  color={likeData.liked ? colors.accent : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.pillBtnText,
                    {
                      color: likeData.liked ? colors.accent : colors.textSecondary,
                    },
                  ]}
                >
                  {likeData.likes}
                </Text>
              </TouchableOpacity>

              {/* Reply Button */}
              {!isReply && (
                <TouchableOpacity
                  style={[
                    styles.pillBtn,
                    {
                      backgroundColor: colors.searchBg,
                      borderColor: colors.glassBorder,
                    },
                  ]}
                  onPress={() => handleReplyComment(comment)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="arrow-undo-outline"
                    size={13}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[styles.pillBtnText, { color: colors.textSecondary }]}
                  >
                    Balas
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Nested Replies */}
        {!isReply && comment.replies && comment.replies.length > 0 && (
          <View
            style={[
              styles.repliesSection,
              { borderLeftColor: colors.glassBorder },
            ]}
          >
            {comment.replies.map((reply) => renderComment(reply, true))}
          </View>
        )}
      </View>
    );
  };

  // ============================================
  // MAIN COMPONENT
  // ============================================

  return (
    <View style={styles.container}>
      {/* Login Modal */}
      {renderLoginModal()}

      {/* Delete Confirm Modal */}
      {renderDeleteModal()}

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <View
            style={[
              styles.headerIconWrap,
              {
                backgroundColor: colors.accent + "18",
                borderColor: colors.accent + "35",
              },
            ]}
          >
            <Ionicons name="chatbubbles" size={17} color={colors.accent} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Komentar
          </Text>
          <View
            style={[
              styles.countBadge,
              {
                backgroundColor: colors.accent + "18",
                borderColor: colors.accent + "35",
              },
            ]}
          >
            <Text style={[styles.countBadgeText, { color: colors.accent }]}>
              {comments.length}
            </Text>
          </View>
        </View>

        {/* Sort Button */}
        <TouchableOpacity
          style={[
            styles.sortBtn,
            {
              backgroundColor: colors.glass,
              borderColor: colors.glassBorder,
            },
          ]}
          onPress={() =>
            setSortOrder((prev) => (prev === "latest" ? "oldest" : "latest"))
          }
          activeOpacity={0.7}
        >
          <Ionicons
            name="swap-vertical"
            size={13}
            color={colors.textSecondary}
          />
          <Text style={[styles.sortBtnText, { color: colors.textSecondary }]}>
            {sortOrder === "latest" ? "Terbaru" : "Terlama"}
          </Text>
          <Ionicons
            name="chevron-down"
            size={13}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Input Area */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.glass,
            borderColor: colors.glassBorder,
          },
          glassWebStyle(24),
        ]}
      >
        {/* Reply/Edit Banner */}
        {(replyingTo || editingComment) && (
          <View
            style={[
              styles.actionBanner,
              {
                backgroundColor: colors.searchBg,
                borderColor: colors.glassBorder,
              },
            ]}
          >
            <View style={styles.actionBannerLeft}>
              <Ionicons
                name={editingComment ? "create-outline" : "arrow-undo-outline"}
                size={16}
                color={colors.accent}
              />
              <Text style={[styles.actionBannerText, { color: colors.text }]}>
                {editingComment
                  ? "Mengedit komentar..."
                  : "Membalas komentar..."}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleCancel}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="close-circle"
                size={18}
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
                backgroundColor: colors.accent + "12",
                borderColor: colors.accent + "30",
              },
            ]}
            activeOpacity={0.8}
            onPress={() => setShowLoginModal(true)}
          >
            <View
              style={[
                styles.guestIconWrap,
                { backgroundColor: colors.accent + "20" },
              ]}
            >
              <Ionicons
                name="lock-closed"
                size={15}
                color={colors.accent}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.guestBannerTitle, { color: colors.text }]}>
                Gabung dalam diskusi
              </Text>
              <Text
                style={[
                  styles.guestBannerSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                Login untuk mulai menulis atau membalas komentar
              </Text>
            </View>
            <View
              style={[
                styles.guestLoginPill,
                { backgroundColor: colors.accent },
              ]}
            >
              <Text style={styles.guestLoginPillText}>Login</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Input Row - Desktop Form vs Mobile Form */}
        {isDesktop ? (
          <View style={styles.desktopInputWrap}>
            <TouchableOpacity
              style={{ width: "100%" }}
              activeOpacity={isAuthenticated ? 1 : 0.8}
              onPress={!isAuthenticated ? () => setShowLoginModal(true) : undefined}
            >
              <TextInput
                style={[
                  styles.desktopTextInput,
                  {
                    backgroundColor: colors.searchBg,
                    color: colors.text,
                    borderColor: colors.glassBorder,
                    opacity: isAuthenticated ? 1 : 0.6,
                    outline: "none",
                  } as any,
                ]}
                placeholder={
                  !isAuthenticated
                    ? "Login terlebih dahulu untuk berkomentar..."
                    : replyingTo
                    ? "Tulis balasan Anda di sini..."
                    : editingComment
                    ? "Edit komentar Anda di sini..."
                    : "Bagikan pendapat atau reaksimu tentang episode ini..."
                }
                placeholderTextColor={colors.textMuted}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
                numberOfLines={3}
                editable={!!isAuthenticated}
              />
            </TouchableOpacity>

            <View style={styles.toolbarRow}>
              {/* Left format tools */}
              <View style={styles.toolbarLeft}>
                <TouchableOpacity
                  style={[
                    styles.toolbarIconBtn,
                    {
                      backgroundColor: colors.searchBg,
                      borderColor: colors.glassBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="image-outline"
                    size={16}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toolbarIconBtn,
                    {
                      backgroundColor: colors.searchBg,
                      borderColor: colors.glassBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="happy-outline"
                    size={16}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toolbarIconBtn,
                    {
                      backgroundColor: colors.searchBg,
                      borderColor: colors.glassBorder,
                    },
                  ]}
                >
                  <Text
                    style={[styles.toolbarText, { color: colors.textSecondary }]}
                  >
                    B
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toolbarIconBtn,
                    {
                      backgroundColor: colors.searchBg,
                      borderColor: colors.glassBorder,
                    },
                  ]}
                >
                  <Text
                    style={[styles.toolbarText, { color: colors.textSecondary }]}
                  >
                    I
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Right Post button */}
              <TouchableOpacity
                style={[
                  styles.desktopPostBtn,
                  { backgroundColor: colors.accent },
                  (!commentText.trim() || submitting || !isAuthenticated) &&
                    styles.desktopPostBtnDisabled,
                ]}
                onPress={
                  isAuthenticated
                    ? handleSubmitComment
                    : () => setShowLoginModal(true)
                }
                disabled={submitting || !commentText.trim() || !isAuthenticated}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons
                      name="paper-plane"
                      size={14}
                      color="#FFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.postBtnText}>
                      {editingComment ? "Simpan" : "Kirim"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={isAuthenticated ? 1 : 0.8}
              onPress={!isAuthenticated ? () => setShowLoginModal(true) : undefined}
            >
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.searchBg,
                    color: colors.text,
                    borderColor: colors.glassBorder,
                    opacity: isAuthenticated ? 1 : 0.6,
                  },
                ]}
                placeholder={
                  !isAuthenticated
                    ? "Login untuk berkomentar..."
                    : editingComment
                    ? "Edit komentar Anda..."
                    : replyingTo
                    ? "Tulis balasan Anda..."
                    : "Tulis komentar..."
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
                  name={isAuthenticated ? "paper-plane" : "lock-closed"}
                  size={17}
                  color="#FFF"
                />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Comment List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map((key) => (
            <View
              key={key}
              style={[
                styles.skeletonCard,
                {
                  backgroundColor: colors.glass,
                  borderColor: colors.glassBorder,
                },
                glassWebStyle(16),
              ]}
            >
              <View style={styles.skeletonHeader}>
                <Shimmer style={styles.skeletonAvatar} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Shimmer style={{ width: 110, height: 13, borderRadius: 6 }} />
                  <Shimmer style={{ width: 60, height: 10, borderRadius: 4 }} />
                </View>
              </View>
              <Shimmer
                style={{
                  width: "92%",
                  height: 12,
                  borderRadius: 4,
                  marginTop: 12,
                }}
              />
              <Shimmer
                style={{
                  width: "65%",
                  height: 12,
                  borderRadius: 4,
                  marginTop: 6,
                }}
              />
            </View>
          ))}
        </View>
      ) : displayedComments.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: colors.glass,
              borderColor: colors.glassBorder,
            },
            glassWebStyle(16),
          ]}
        >
          <View
            style={[
              styles.emptyIconWrap,
              {
                backgroundColor: colors.searchBg,
                borderColor: colors.glassBorder,
              },
            ]}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={36}
              color={colors.textMuted}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Belum ada komentar
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Jadilah yang pertama berbagi pemikiran tentang anime ini!
          </Text>
        </View>
      ) : (
        <View style={styles.commentsList}>
          {displayedComments.map((comment) => renderComment(comment))}
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
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  inputContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
  },
  actionBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  actionBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBannerText: {
    fontSize: 13,
    fontWeight: "600",
  },
  guestBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  guestIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  guestBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  guestBannerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  guestLoginPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  guestLoginPillText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  desktopInputWrap: {
    width: "100%",
  },
  desktopTextInput: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    minHeight: 88,
  },
  toolbarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  toolbarLeft: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  toolbarIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  toolbarText: {
    fontSize: 13,
    fontWeight: "700",
  },
  desktopPostBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: "center",
  },
  desktopPostBtnDisabled: {
    opacity: 0.45,
  },
  postBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 96,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  loadingContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  skeletonCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  skeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  skeletonAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  emptyCard: {
    marginHorizontal: 16,
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
  },
  commentsList: {
    paddingHorizontal: 16,
  },
  commentContainer: {
    marginBottom: 12,
  },
  commentCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  replyCard: {
    borderRadius: 14,
    padding: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "800",
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
    gap: 8,
    flexWrap: "wrap",
  },
  username: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  levelPill: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
  },
  userLevel: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  modBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
  },
  modBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  timestampWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  timestampText: {
    fontSize: 11.5,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 6,
  },
  iconCircleBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  commentText: {
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 8,
  },
  interactionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  pillBtnText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  repliesSection: {
    borderLeftWidth: 2,
    marginLeft: 18,
    paddingLeft: 12,
    marginTop: 8,
    gap: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 26,
    alignItems: "center",
    elevation: 12,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 13.5,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  modalDivider: {
    width: "100%",
    height: 1,
    marginBottom: 18,
  },
  modalLoginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 13,
    borderRadius: 14,
    marginBottom: 10,
  },
  modalLoginBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  modalCancelBtn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
}) as any;

export default CommentSection;

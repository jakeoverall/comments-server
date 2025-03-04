import { Auth0Provider } from '@bcwdev/auth0provider'
import BaseController from '../utils/BaseController.js'
import { BadRequest, Forbidden } from '../utils/Errors.js'

const comments = {
  'All Comments': []
}

// http://localhost:3000/api/comments
// http://localhost:3000/api/comments/videoId1

export class CommentsController extends BaseController {
  constructor() {
    super('api/comments')
    this.router
      .get('', this.getallComments)
      .get('/:videoId', this.getCommentsByVideoId)

      // NOTE: Beyond this point all routes require Authorization Bearer token
      .use(Auth0Provider.getAuthorizedUserInfo)
      .put('/:commentId/flag', this.flagCommentOrReply)
      .post('', this.createComment.bind(this))
  }

  async getallComments(request, response, next) {
    return response.send(comments);
  }

  async getCommentsByVideoId(request, response, next) {
    try {
      const videoId = request.params.videoId;
      if (!comments[videoId]) {
        return response.send([]);
      }

      // Ensure `isEditing: false` and initialize replies
      const allComments = comments[videoId].map(comment => ({
        ...comment,
        isEditing: false,
        replies: [] // Ensure replies array exists
      }));

      // Create a map for comments by ID
      const commentMap = {};
      allComments.forEach(comment => {
        commentMap[comment.id] = comment;
      });

      // Nest replies under their parent comments
      allComments.forEach(comment => {
        if (comment.parentId && comment.parentId !== comment.id) {
          // This is a reply, attach it to its parent
          if (commentMap[comment.parentId]) {
            commentMap[comment.parentId].replies.push(comment);
          }
        }
      });

      // Filter out replies from the top-level array (only keep main comments)
      const nestedComments = allComments.filter(comment => !comment.parentId || comment.parentId === comment.id);

      response.send(nestedComments);
    } catch (error) {
      next(error);
    }
  }

  async flagCommentOrReply(request, response, next) {
    try {
      const { commentId, videoId } = request.body;
      const userId = request.userInfo?.id;

      if (!comments[videoId]) {
        throw new BadRequest("Invalid Id")
      }

      const commentIndex = comments[videoId]?.findIndex(c => c.id === commentId);
      const comment = comments[videoId][commentIndex]
      if (!comment) {
        throw new BadRequest("Invalid Id")
      }

      // Prevent users from flagging their own content
      // if (comment.creatorId === userId) {
      //   throw new Forbidden("You cannot flag your own content")
      // }

      comment.flagged = comment.flagged || [];

      // if (comment.flagged.includes(userId)) {
      //   throw new BadRequest("You have already flagged this content")
      // }

      comment.flagged.push(userId);

      // If flagged count reaches 5, delete the content
      if (comment.flagged.length >= 5) {
        comments[videoId].splice(commentIndex, 1)
        return response.send({ message: "Content flagged and deleted due to multiple flags.", status: 'removed'});
      }

      response.send({ message: "Content flagged successfully", flagCount: comment.flagged.length, comment });
    } catch (error) {
      console.error("Error flagging content:", error);
      next(error);
    }
  }





  async createComment(request, response, next) {
    try {
      const comment = request.body;
      // NOTE NEVER TRUST THE CLIENT TO ADD THE CREATOR ID
      // comment.creatorId = request.userInfo.id
      comment.creatorId = request.userInfo.id;

      comments[comment.videoId] = comments[comment.videoId] || [];
      comment.user = {
        name: request.userInfo.name,
        picture: request.userInfo.picture,
      }
      comments[comment.videoId].push({
        ...comment,
        isEditing: false,
        replies: [], // Initialize replies array on creation
        flagged: [],
        flagCount: 0
      });

      response.send(comment);
    } catch (error) {
      next(error);
    }
  }
}

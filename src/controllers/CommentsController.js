import { Auth0Provider } from '@bcwdev/auth0provider'
import BaseController from '../utils/BaseController.js'

const comments = {
  'videoId1': []
}

// http://localhost:3000/api/comments
// http://localhost:3000/api/comments/videoId1


export class CommentsController extends BaseController {
  constructor() {
    super('api/comments')
    this.router
      .get('/:videoId', this.getCommentsByVideoId)
      // NOTE: Beyond this point all routes require Authorization Bearer token
      .use(Auth0Provider.getAuthorizedUserInfo)
      .post('', this.createComment.bind(this))
  }

  async getCommentsByVideoId(request, response, next) {
    try {
      const videoId = request.params.videoId
      response.send(comments[videoId] || [])
    } catch (error) {
      next(error)
    }
  }

  async createComment(request, response, next) {
    try {
      const comment = request.body
      // NOTE NEVER TRUST THE CLIENT TO ADD THE CREATOR ID
      comment.creatorId = request.userInfo.id

      comments[comment.videoId] = comments[comment.videoId] || []
      comments[comment.videoId].push(comment)

      response.send(comment)
    } catch (error) {
      next(error)
    }
  }


}
import { postAndGetJSON } from './utils.js'

export class DatabaseModel {
  getByName = async (keyword, table) => postAndGetJSON('api/get-by-name', { keyword, table })
  getSongNames = async keyword => this.getByName(keyword, 'song_names')
  getCollectionNames = async keyword => this.getByName(keyword, 'collections')
  getMediaNames = async keyword => this.getByName(keyword, 'medias')
  getAuthorNames = async keyword => this.getByName(keyword, 'authors')
  getFeatureNames = async keyword => this.getByName(keyword, 'features')
}

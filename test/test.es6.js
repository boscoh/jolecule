import fs from 'fs'
import { Soup } from '../src/soup'
import { SoupView } from '../src/soup-view'
import { SoupController } from '../src/soup-controller'

it('check load soup', function () {
  let f = '../examples/1mbo.pdb'
  let pdbText = fs.readFileSync(f).toString()
  let soup = new Soup()
  soup.parsePdbData(pdbText, '1mbo')
})

it('check load soup components', function () {
  let f = '../examples/1mbo.pdb'
  let pdbText = fs.readFileSync(f).toString()
  let soup = new Soup()
  soup.parsePdbData(pdbText, '1mbo')

  let g = '../examples/1mbo.components.json'
  let jsonText = fs.readFileSync(g).toString()
  let viewDicts = JSON.parse(jsonText)

  let soupView = new SoupView(soup)
  let controller = new SoupController(soupView)
  controller.loadViewsFromViewDicts(viewDicts)
})

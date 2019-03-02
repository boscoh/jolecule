import fs from 'fs'
import { Soup } from '../src/soup'
import { SoupView, SoupViewController } from '../src/soup-view'

it('check load soup', function() {
  let f = '../examples/1mbo.pdb'
  let pdbText = fs.readFileSync(f).toString()
  let soup = new Soup()
  soup.parsePdbData(pdbText, '1mbo')
})

it('check load soup views', function() {
  let f = '../examples/1mbo.pdb'
  let pdbText = fs.readFileSync(f).toString()
  let soup = new Soup()
  soup.parsePdbData(pdbText, '1mbo')

  let g = '../examples/1mbo.views.json'
  let jsonText = fs.readFileSync(g).toString()
  let viewDicts = JSON.parse(jsonText)

  let soupView = new SoupView(soup)
  let controller = new SoupViewController(soupView)
  controller.loadViewsFromViewDicts(viewDicts)
})

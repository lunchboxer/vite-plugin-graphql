const os = require('node:os')
const { print } = require('graphql/language/printer')
const gql = require('graphql-tag')

// Collect any fragment/type references from a node, adding them to the references Set
function collectFragmentReferences(node, references) {
  if (node.kind === 'FragmentSpread') {
    references.add(node.name.value)
  } else if (node.kind === 'VariableDefinition') {
    const type = node.type
    if (type.kind === 'NamedType') {
      references.add(type.name.value)
    }
  }
  if (node.selectionSet) {
    for (const selection of node.selectionSet.selections) {
      collectFragmentReferences(selection, references)
    }
  }
  if (node.variableDefinitions) {
    for (const definition of node.variableDefinitions) {
      collectFragmentReferences(definition, references)
    }
  }
  if (node.definitions) {
    for (const definition of node.definitions) {
      collectFragmentReferences(definition, references)
    }
  }
}

function findOperation(document, name) {
  for (let index = 0; index < document.definitions.length; index++) {
    const element = document.definitions[index]
    if (element.name && element.name.value === name) {
      return element
    }
  }
}

const graphqlPluginStrings = {
  async transform(graphqlDocument, id) {
    if (!id.endsWith('.gql') && !id.endsWith('.graphql')) return
    const document = gql`
      ${graphqlDocument}
    `
    let outputCode = ''
    // only support named queries and named imports
    //
    // no graphql imports unfortunately
    const operationCount = document.definitions.reduce(function (accum, op) {
      if (op.kind === 'OperationDefinition') {
        return accum + 1
      }
      return accum
    }, 0)

    const definitionReferences = {}

    for (const definition of document.definitions) {
      if (definition.name) {
        const references = new Set()
        collectFragmentReferences(definition, references)
        definitionReferences[definition.name.value] = references
      }
    }

    function oneQuery(document, operationName) {
      // Copy the DocumentNode, but clear out the definitions
      const newDocument = {
        kind: document.kind,
        definitions: [findOperation(document, operationName)],
      }
      if (Object.prototype.hasOwnProperty.call(document, 'loc')) {
        newDocument.loc = document.loc
      }
      // Now, for the operation we're running, find any fragments referenced by
      // it or the fragments it references
      const opReferences = definitionReferences[operationName] || new Set()
      const allReferences = new Set()
      let newReferences = new Set(opReferences)
      while (newReferences.size > 0) {
        const previousReferences = newReferences
        newReferences = new Set()
        for (const referenceName of previousReferences) {
          if (!allReferences.has(referenceName)) {
            allReferences.add(referenceName)
            const childReferences =
              definitionReferences[referenceName] || new Set()
            for (const childReference of childReferences) {
              newReferences.add(childReference)
            }
          }
        }
      }
      /// this is empty for somereason
      for (const referenceName of allReferences) {
        const op = findOperation(document, referenceName)
        if (op) {
          newDocument.definitions.push(op)
        }
      }
      return newDocument
    }

    for (const op of document.definitions) {
      if (op.kind === 'OperationDefinition') {
        if (!op.name) {
          if (operationCount > 1) {
            throw new Error(
              'Query/mutation names are required for a document with multiple definitions',
            )
          } else {
            continue
          }
        }

        const opName = op.name.value
        outputCode += `export const ${opName} = \`${print(
          oneQuery(document, opName),
        )}\`;`
        outputCode += os.EOL
      }
    }
    const allCode = outputCode + os.EOL
    return allCode
  },
}

module.exports = graphqlPluginStrings

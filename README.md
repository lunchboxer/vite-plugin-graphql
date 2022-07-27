# vite-plugin-graphql-strings

Based on [vite-plugin-graphql](https://github.com/hronro/vite-plugin-graphql), but somewhat simpler. I prefer simple strings for my queries. This versions has a lot of limitation and probably isn't what you are looking for.

While it isn't hard to get strings from a .graphql file by looking for empty lines, this plugin combines the fragments with your query, as long as the fragments are found in the same document.

## Installation

```sh
npm i vite-plugin-graphql-strings
```

## Usage

```javascript
const graphqlPlugin = require('vite-plugin-graphql-strings')

const config = {
  plugins: [
    graphqlStringsPlugin({
      exportToUpperCase: true, // default
    }),
  ],
}
```

When `exportToUpperCase` the query names conventionally written in PascalCase like `GetAllPosts` will be converted to uppercase as is the convention for Javascript constants resulting in `GET_ALL_POSTS` with the previous example.

Now all the files ends with `.gql` or `.graphql` will be handled by `vite-plugin-graphql-strings`.

## In your app

```javascript
import { SomeAmazingQuery } from './queries.graphql'
```

That will be a simple string representing the query object. Your queries can be in separate files or a single queries.graphql, but because the queries are processed into strings at compile time, they cannot import from other documents, so `#import` will be ignored.

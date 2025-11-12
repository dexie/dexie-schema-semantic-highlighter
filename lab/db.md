```ts

const db = new Dexie('myDexie');

db.version(1).stores({
  friends: `
    @id
    name: Text
    age
    doc: Y.Doc
  `
});

```

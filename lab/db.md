```ts

const db = new Dexie('myDexie').version(1).stores({
  friends: schema<Friend>`
    ++id
    name: Collated
    age
    doc: Y.Doc
  `,
  pets: model(Pet)`
    @id
    name
    age
  `
});

export interface Friend {
  id: number;
  name: string;
  age: number;
}

export const friends = schema<Friend>`
  ++id
  name: Collated
  age
`;


const db = new Dexie("myDB").version(1).stores({friends, pets});

export class Friend extends Entity({friends, pets}) {

}

```

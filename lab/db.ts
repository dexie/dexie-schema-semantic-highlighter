import Dexie from "dexie";



const db = new Dexie("myDexie");

db.version(1).stores({
  friends: `
    +id # Primary key

    # The following indexes are created for efficient querying:
    name
    age
    *tags           # Multi-entry index for tags array

    # Specific Y.js support:
    doc: Y.Doc 

    [name+age]      # Compound index on name and age
    address.city    # Indexing city inside address object

  `
});

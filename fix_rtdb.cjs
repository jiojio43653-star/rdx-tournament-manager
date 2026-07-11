const fs = require('fs');
const files = [
  'src/pages/Home.tsx',
  'src/pages/Admin.tsx',
  'src/pages/TournamentDetails.tsx',
  'src/pages/AdminDashboard.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Imports
  code = code.replace(/import \{.*?\} from 'firebase\/database';\n?/, '');
  code = code.replace(/import \{ rtdb, db \} from '\.\.\/lib\/firebase';/g, "import { db } from '../lib/firebase';");
  code = code.replace(/import \{ db, rtdb \} from '\.\.\/lib\/firebase';/g, "import { db } from '../lib/firebase';");
  code = code.replace(/import \{ rtdb \} from '\.\.\/lib\/firebase';/g, "import { db } from '../lib/firebase';");
  
  // Adding imports if missing
  if (code.indexOf('firebase/firestore') === -1) {
    code = `import { doc, getDoc, setDoc, onSnapshot, updateDoc, deleteDoc, collection } from 'firebase/firestore';\n` + code;
  } else {
    code = code.replace(/import \{(.*?)\} from 'firebase\/firestore';/, (match, p1) => {
      const parts = p1.split(',').map(p => p.trim());
      const needs = ['doc', 'getDoc', 'setDoc', 'onSnapshot', 'updateDoc', 'deleteDoc', 'collection'];
      for (const n of needs) {
        if (!parts.includes(n)) parts.push(n);
      }
      return `import { ${parts.join(', ')} } from 'firebase/firestore';`;
    });
  }

  // Ref -> Doc replacements
  // onValue(ref(rtdb, 'settings/app'), (snapshot) => {
  code = code.replace(/onValue\(ref\(rtdb, '(.*?)'\), \(snapshot\) => \{/g, "onSnapshot(doc(db, '$1'), (snapshot) => {");
  // onValue(ref(rtdb, `players`), ... -> onSnapshot(collection(db, 'players'), ...
  code = code.replace(/onValue\(ref\(rtdb, 'players'\), \(snapshot\) => \{/g, "onSnapshot(collection(db, 'players'), (snapshot) => {");
  
  // snapshot.val() -> snapshot.data()
  // Wait, for collection snapshot.val() doesn't exist, it's snapshot.forEach
  // In AdminDashboard: snapshot.forEach((childSnapshot) => { data.push(childSnapshot.val()) })
  // becomes snapshot.forEach((docSnap) => { data.push(docSnap.data()) })
  
  // Let's do replacements manually.
  fs.writeFileSync(file, code);
}
console.log("Done");

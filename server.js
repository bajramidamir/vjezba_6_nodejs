// INICIJALIZACIJA
const mysql = require("mysql2");
const express = require("express");
const app = express();
const SERVER_PORT = 3000;

// MIDDLEWARE - POTREBNO
app.use(express.static(__dirname));

// POVEZIVANJE S BAZOM - UNIJETI SVOJE PODATKE!!!
const connection = mysql.createConnection({
  host: "bazepodataka.ba",
  user: "student",
  password: "",
  database: "student",
  port: 7306,
});
connection.connect((err) => {
  if (err) throw err;
  console.log("Spojeni s bazom");
});

// Pregled rezultata nastalih običnim upitima (zaposlenici)
app.get("/zaposlenici", (req, res) => {
  connection.query("SELECT * FROM zaposlenik", (error, results) => {
    if (error) throw error;
    console.log("=====================================================");
    console.log("Izvrsavamo SELECT * FROM zaposlenik upit ispod: ");
    console.log(results);
  });
});

// Pozivanje procedure - zanemarimo hardcoded parametar za ovaj primjer
app.get("/procedura", (req, res) => {
  connection.query("CALL vrati_podatke_zaposlenika(2)", (error, results) => {
    if (error) throw error;
    console.log(
      "Ime i prezime zaposlenika: " +
        results[0][0].ime +
        " " +
        results[0][0].prezime
    );
    console.log("Dataset-ovi: ");
    for (let i = 1; i < results.length; i++) {
      for (let j = 0; j < results[i].length; j++) {
        console.log(results[i][j]);
      }
    }
  });
});

// Pozivanje procedure sa parametrima
app.get("/procedura-params", (req, res) => {
  const parametar = "1"; // zelimo prvog zaposlenika, naprimjer . . .
  connection.query(
    "CALL vrati_podatke_zaposlenika(?)",
    [parametar],
    (error, results) => {
      // OBRATITI PAZNJU NA SINTAKSU - (?) JE PLACEHOLDER U KOJI UNOSIMO [parametar]
      if (error) throw error;
      console.log(
        "Ime i prezime zaposlenika: " +
          results[0][0].ime +
          " " +
          results[0][0].prezime
      );
      console.log("Dataset-ovi: ");
      for (let i = 1; i < results.length; i++) {
        for (let j = 0; j < results[i].length; j++) {
          console.log(results[i][j]);
        }
      }
    }
  );
});

// IMPORT KURSNE LISTE
app.get("/import-kursne-liste", (req, res) => {
  const danasnjiDatum = new Date();
  const danasnjiFormatiranDatum = `${
    danasnjiDatum.getMonth() + 1
  }/${danasnjiDatum.getDate()}/${danasnjiDatum.getFullYear()} 00:00:00`;

  fetch(
    `https://www.cbbh.ba/CurrencyExchange/GetJson?date=${danasnjiFormatiranDatum}`
  )
    .then((response) => response.json())
    .then((data) => {
      const datum = new Date(data.Date);

      const godina = datum.getFullYear();
      const formatiranDatum = `${datum.getFullYear()}-${datum.getDate()}-${
        datum.getMonth() + 1
      }`;

      const broj = data.Number;
      const nizKursValute = data.CurrencyExchangeItems;

      console.log(
        `Podaci koji bi se dodali u tabelu kursna_lista: (${godina}, ${formatiranDatum}, ${broj})`
      );
      console.log("Podaci koji bi se dodali u tabelu kurs_valute :");

      nizKursValute.forEach((element) => {
        console.log(
          element.AlphaCode,
          element.NumCode,
          element.Units,
          element.Buy,
          element.Middle,
          element.Sell
        );

        // ovo ispod su ispravi upiti, ali ih necemo izvrsavati da ne bismo dobijali "duplication error" s obzirom da se vec nalaze ovi podaci u tabelama

        /* const q1 = "INSERT INTO kursna_lista(datum_kursne_liste, godina, broj_kursne_liste) VALUES (?, ?, ?)";
       connection.query(q1, [formatiranDatum, godina, broj], (error, results) => {
          if (error) throw error;
          console.log("Uspjesno dodali u tabelu");
        }
      ); 

      const q2 = "INSERT INTO kurs_valute( oznaka_valute, kod_valute, jedinica, kupovni_kurs, srednji_kurs, prodajni_kurs) VALUES (?, ?, ?, ?, ?, ?)";
        connection.query(q2, [
          element.AlphaCode,
          element.NumCode,
          element.Units,
          element.Buy,
          element.Middle,
          element.Sell,
        ]); */
      });
    });
});

app.get("/import-kursne-liste-proc", (req, res) => {
  const danasnjiDatum = new Date();
  const danasnjiFormatiranDatum = `${
    danasnjiDatum.getMonth() + 1
  }/${danasnjiDatum.getDate()}/${danasnjiDatum.getFullYear()} 00:00:00`;

  fetch(
    `https://www.cbbh.ba/CurrencyExchange/GetJson?date=${danasnjiFormatiranDatum}`
  )
    .then((response) => response.json())
    .then((data) => {
      const datum = new Date(data.Date);
      const godina = datum.getFullYear();
      const broj = data.Number;

      connection.execute(
        "CALL proc_dodaj_kursnu_listu(?, ?, ?, @p_kod_greske, @p_kursna_lista_id)",
        [datum, godina, broj],
        (error, results) => {
          if (error) throw error;
          connection.query(
            "SELECT @p_kod_greske AS kod_greske, @p_kursna_lista_id AS kursna_lista_id",
            (err, outResults, outFields) => {
              if (err) {
                console.error(error);
                res
                  .status(500)
                  .json({ error: "Error fetching OUT parameters" });
                return;
              }
              const kodGreske = outResults[0].kod_greske;
              const kursnaListaId = outResults[0].kursna_lista_id;

              console.log(
                "Kod greske 0 znaci da smo dodali u bazu, 1 znaci da postoji kursna lista s datim brojem, 2 znaci da kursna lista s navedenim datumom postoji "
              );

              console.log("Kod greske: " + kodGreske);
              console.log("Kursna lista id: " + kursnaListaId);
            }
          );
        }
      );
    });
});

// =====================================================================================
// Index putanja, servira nam index.html
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.listen(SERVER_PORT, () => {
  console.log("Server pokrenut na: http://localhost:3000");
});

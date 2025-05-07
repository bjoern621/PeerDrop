import css from "./DataSharingPage.module.scss";
import {
    Box,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    LinearProgress,
    Paper,
    Typography,
    Container,
    Card
} from '@mui/material';
import { ArrowDownward, ArrowUpward, PostAdd } from '@mui/icons-material';

const mockData = [
    {
        name: 'Datei01-final.png',
        direction: 'down',
        progress: 40,
        size: '200 MB',
        time: '19:31:51',
    },
    {
        name: 'Datei02.pdf',
        direction: 'down',
        progress: 100,
        size: '147 MB',
        time: '19:02:20',
    },
    {
        name: 'File-XYZ.txt',
        direction: 'up',
        progress: 70,
        size: '30 B',
        time: '20:10:02',
    },
];

export function DataSharingPage() {
    return (
        <Container maxWidth={false}>
            <h1 className={css.heading}>P2P Datei-Sharing</h1>
            <Card>
                <Box p={3}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{mb:2}}>
                        <Button variant="contained" sx={{ color: 'white', backgroundColor: "	#444444" }}>Dateien hinzufügen</Button>
                        <Typography variant="body1">Partner: 7 0 K 3 N</Typography>
                        <Button variant="contained" color="error" sx={{ color: 'white', backgroundColor: "	#444444" }}>Verbindung trennen</Button>
                    </Box>

                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Name</strong></TableCell>
                                    <TableCell><strong>Fortschritt</strong></TableCell>
                                    <TableCell><strong>Größe</strong></TableCell>
                                    <TableCell><strong>Zeitstempel</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {mockData.map((file, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{file.name}</TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center">
                                                {file.direction === 'down' ? <ArrowDownward fontSize="small" /> : <ArrowUpward fontSize="small" />}
                                                {file.progress === 100 ? (
                                                    <Typography sx={{ml:1}}>Fertig!</Typography>
                                                ) : (
                                                    <Box width="100%" sx={{ml:1}}>
                                                        <LinearProgress variant="determinate" value={file.progress} />
                                                    </Box>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>{file.size}</TableCell>
                                        <TableCell>{file.time}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Box mt={4} textAlign="center" color="grey.500">
                        <PostAdd sx={{ fontSize: 250 }} />
                        <Typography sx={{fontSize: 40 }}><strong>Drag and Drop</strong></Typography>
                    </Box>
                </Box>
            </Card>
        </Container>

    );
}
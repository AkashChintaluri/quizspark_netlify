import { useParams } from 'react-router-dom';

function TakeQuiz() {
    const { quizCode } = useParams();
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [answers, setAnswers] = useState({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${API_BASE_URL}/quiz/${quizCode}`);
                if (response.data) {
                    setQuiz(response.data);
                } else {
                    setError('Quiz not found');
                }
            } catch (err) {
                console.error('Error fetching quiz:', err);
                setError('Failed to load quiz');
            } finally {
                setLoading(false);
            }
        };

        if (quizCode) {
            fetchQuiz();
        }
    }, [quizCode]);

    // ... rest of the existing code ...
} 
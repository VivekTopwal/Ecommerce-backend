
import User from '../models/User'
import jwt from 'jsonwebtoken'

const generateRefreshToken = async (userId) => {
    const token = await jwt.sign(
        { id: userId },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' }
    )

    const updateRefreshTokenUser = await User.updateOne()(
        {_id:userId},
        {
            refresh_token: token
        }
    )

    return token
}

export default generateRefreshToken